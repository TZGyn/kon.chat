import {
	APICallError,
	createDataStreamResponse,
	smoothStream,
	streamText,
	formatDataStreamPart,
	type TextStreamPart,
	type ToolSet,
} from 'ai'
import { z } from 'zod'
import { getCookie } from 'hono/cookie'
import { APP_ENV } from '$env/static/private'

// For extending the Zod schema with OpenAPI properties
import 'zod-openapi/extend'
import { validator as zValidator } from 'hono-openapi/zod'

import { db } from '$api/db'
import { chat, message, upload } from '$api/db/schema'
import { and, eq, inArray } from 'drizzle-orm'
import { Hono } from 'hono'
import { type GoogleGenerativeAIProviderMetadata } from '@ai-sdk/google'
import { getModel, modelSchema } from '$api/model'
import { checkNewChat, processMessages } from '$api/message'
import {
	mergeChunksToResponse,
	updateUserChatAndLimit,
} from '$api/chat/utils'
import { serialize } from 'hono/utils/cookie'
import { tools } from '$api/ai/tools'
import { nanoid } from '$api/utils'
import { s3Client } from '$api/s3'
import {
	getUploadIDsFromMessages,
	replaceAttachment,
} from '$api/chat/attachments'
import { describeRoute } from 'hono-openapi'
import { createRedis, redis } from '$api/redis'
import { streamSSE } from 'hono/streaming'
import type { auth } from '$api/auth'

const arrToObj = (arr: string[]) => {
	const obj: Record<string, string> = {}

	for (let i = 0; i < arr.length; i += 2) {
		obj[arr[i]] = JSON.parse(arr[i + 1])
	}

	return obj
}

const app = new Hono<{
	Variables: {
		user: typeof auth.$Infer.Session.user | null
		session: typeof auth.$Infer.Session.session | null
	}
}>()
	.get('/', describeRoute({ tags: ['chat'] }), async (c) => {
		const user = c.get('user')

		if (!user) {
			return c.json({ chats: [] })
		}

		const chats = await db.query.chat.findMany({
			columns: {
				id: true,
				title: true,
				visibility: true,
				createdAt: true,
				updatedAt: true,
			},
			where: (chat, { eq }) => eq(chat.userId, user.id),
			orderBy: (chat, { desc }) => [desc(chat.createdAt)],
		})

		return c.json({ chats })
	})

	.get('/sync', describeRoute({ tags: ['chat'] }), async (c) => {
		const user = c.get('user')

		if (!user) {
			return c.json({ chats: [] })
		}

		const chats = await db.query.chat.findMany({
			columns: {
				id: true,
				userId: true,
				title: true,
				createdAt: true,
				updatedAt: true,
			},
			with: {
				messages: {
					columns: {
						content: true,
						role: true,
						model: true,
						id: true,
						responseId: true,
						createdAt: true,
						chatId: true,
						provider: true,
						providerMetadata: true,
					},
					orderBy: (message, { asc }) => [asc(message.createdAt)],
				},
			},
			where: (chat, { eq }) => eq(chat.userId, user.id),
			orderBy: (chat, { desc }) => [desc(chat.createdAt)],
		})

		return c.json({
			chats: chats.map((chat) => {
				const { userId: chatUserId, ...rest } = chat
				return { ...rest, isOwner: user.id === chatUserId }
			}),
		})
	})

	.post(
		'/branch',
		describeRoute({ tags: ['chat'] }),
		zValidator(
			'json',
			z.object({
				chat_id: z.string(),
				new_chat_id: z.string(),
				at_message_id: z.string(),
			}),
		),
		async (c) => {
			const { at_message_id, chat_id, new_chat_id } =
				c.req.valid('json')

			const user = c.get('user')

			if (!user) {
				return c.text('You must be logged in', 401)
			}

			const existingChat = await db.query.chat.findFirst({
				where: (chat, { eq, and, or }) =>
					and(
						eq(chat.id, chat_id),
						or(
							eq(chat.userId, user.id),
							eq(chat.visibility, 'public'),
						),
					),
				with: {
					messages: {
						orderBy: (message, { asc }) => [asc(message.createdAt)],
					},
				},
			})

			if (!existingChat) {
				return c.text('No chat found', 401)
			}

			const clash = await db.query.chat.findFirst({
				where: (chat, t) => t.eq(chat.id, new_chat_id),
			})

			if (clash) {
				return c.text('New chat already exist', 400)
			}

			const attachments = getUploadIDsFromMessages(
				existingChat.messages.slice(
					0,
					existingChat.messages.findIndex(
						(message) => message.id === at_message_id,
					) + 1,
				),
			)

			await db.insert(chat).values({
				id: new_chat_id,
				title: existingChat.title + ' (branch)',
				userId: user.id,
				visibility: 'private',
				createdAt: Date.now(),
				updatedAt: Date.now(),
			})

			const uploads = await db.query.upload.findMany({
				where: (upload, t) =>
					t.and(t.inArray(upload.id, attachments)),
			})

			const uploadsData = await Promise.all(
				uploads.map(async (upload) => {
					const existing = s3Client.file(upload.key)

					const copyId = `${
						user.id
					}/chat/${new_chat_id}/upload/${nanoid()}-${upload.name}`

					const uploadId =
						nanoid() + `.${upload.mimeType.split('/').pop()}`
					const copy = s3Client.file(copyId)

					await copy.write(existing)
					return {
						originalId: upload.id,
						id: uploadId,
						name: upload.name,
						createdAt: Date.now(),
						userId: user.id,
						key: copyId,
						size: upload.size,
						mimeType: upload.mimeType,
						visibility: 'private' as const,
					}
				}),
			)

			if (existingChat.messages.length > 0) {
				const now = Date.now()
				await db.insert(message).values(
					existingChat.messages
						.slice(
							0,
							existingChat.messages.findIndex(
								(message) => message.id === at_message_id,
							) + 1,
						)
						.map((message, index) => {
							return {
								...message,
								id: nanoid(),
								chatId: new_chat_id,
								createdAt: now + index,
								content: replaceAttachment(message, uploadsData),
							}
						}),
				)
			}

			if (uploadsData.length > 0) {
				await db.insert(upload).values([...uploadsData])
			}

			return c.json({ success: true })
		},
	)

	.get('/:chat_id', describeRoute({ tags: ['chat'] }), async (c) => {
		const chatId = c.req.param('chat_id')

		const session = c.get('session')

		if (!session) {
			const chat = await db.query.chat.findFirst({
				where: (chat, { eq, and, or }) =>
					and(eq(chat.id, chatId), eq(chat.visibility, 'public')),
				with: {
					messages: {
						columns: {
							content: true,
							role: true,
							model: true,
							id: true,
							responseId: true,
							createdAt: true,
							chatId: true,
							provider: true,
							providerMetadata: true,
						},
						orderBy: (message, { asc }) => [asc(message.createdAt)],
					},
				},
			})

			if (chat) {
				const { userId: chatUserId, ...rest } = chat

				return c.json({
					chat: { ...rest, isOwner: false },
				})
			}

			return c.json({ chat: null })
		}

		const user = c.get('user')

		if (!user) {
			const chat = await db.query.chat.findFirst({
				where: (chat, { eq, and, or }) =>
					and(eq(chat.id, chatId), eq(chat.visibility, 'public')),
				with: {
					messages: {
						columns: {
							content: true,
							role: true,
							model: true,
							id: true,
							responseId: true,
							createdAt: true,
							chatId: true,
							provider: true,
							providerMetadata: true,
						},
						orderBy: (message, { asc }) => [asc(message.createdAt)],
					},
				},
			})

			if (chat) {
				const { userId: chatUserId, ...rest } = chat

				return c.json({
					chat: { ...rest, isOwner: false },
				})
			}
			return c.json({ chat: null })
		}

		const chat = await db.query.chat.findFirst({
			where: (chat, { eq, and, or }) =>
				and(eq(chat.id, chatId), or(eq(chat.userId, user.id))),
			with: {
				messages: {
					columns: {
						content: true,
						role: true,
						model: true,
						id: true,
						responseId: true,
						createdAt: true,
						chatId: true,
						provider: true,
						providerMetadata: true,
					},
					orderBy: (message, { asc }) => [asc(message.createdAt)],
				},
			},
		})

		if (chat) {
			const { userId: chatUserId, ...rest } = chat

			return c.json({
				chat: { ...rest, isOwner: user.id === chatUserId },
			})
		}

		return c.json({ chat: null })
	})

	.post('/:chat_id/sse', async (c) => {
		return streamSSE(c, async (stream) => {
			const chatId = c.req.param('chat_id')
			const streamKey = `session:${chatId}`
			const subscription = createRedis()

			subscription.subscribe(streamKey)
			subscription.on('message', async (channel, message) => {
				if (channel === streamKey) {
					try {
						await stream.writeSSE({
							data: message,
							event: 'new-message',
							id: nanoid(),
						})
					} catch (error) {
						console.error(error)
					}
				}
			})

			subscription.on('error', (error) => {
				console.error(
					`SSE subscription error on ${streamKey}:`,
					error,
				)
				stream.close()
			})

			c.req.raw.signal.addEventListener('abort', () => {
				console.log('Client disconnected, cleaning up subscription')
				subscription.unsubscribe(streamKey)
				stream.close()
			})

			while (true) {
				const message = `It is ${new Date().toISOString()}`
				await stream.writeSSE({
					data: message,
					event: 'keep-alive',
					id: nanoid(),
				})
				await stream.sleep(5000)
			}
		})
	})

	.post(
		'/:chat_id',
		describeRoute({ tags: ['chat'] }),
		zValidator(
			'json',
			z.object({
				messages: z.any(),
				provider: modelSchema,
				searchGrounding: z.boolean().default(false),
				mode: z
					.union([
						z.literal('x_search'),
						z.literal('chat'),
						z.literal('web_search'),
						z.literal('academic_search'),
						z.literal('web_reader'),
						z.literal('gpt-image-1'),
					])
					.default('chat'),
				additional_system_prompt: z
					.string()
					.max(1000)
					.optional()
					.nullable()
					.default(''),
				name_for_llm: z
					.string()
					.max(50)
					.optional()
					.nullable()
					.default(''),
				clientId: z.string(),
			}),
		),
		async (c) => {
			const {
				messages,
				provider,
				searchGrounding,
				mode,
				additional_system_prompt,
				name_for_llm,
				clientId,
			} = c.req.valid('json')

			if (searchGrounding && mode !== 'chat') {
				return c.text(
					'Google models does not support calling search grounding and tools at the same time',
					400,
				)
			}

			const chatId = c.req.param('chat_id')

			let cookie: 'none' | 'set' | 'delete' = 'none'

			const session = c.get('session')

			if (!session) {
				return c.json({ error: { message: 'Unauthenticated' } }, 400)
			}

			const user = c.get('user')

			if (!user) {
				return c.json({ error: { message: 'Unauthenticated' } }, 400)
			}

			if (session !== null) {
				cookie = 'set'
			} else {
				cookie = 'delete'
			}

			const settings = await db.query.setting.findFirst({
				where: (setting, t) => t.eq(setting.userId, user.id),
			})

			const {
				coreMessages,
				error: processMessageError,
				userMessage,
				userMessageDate,
			} = processMessages({ provider, messages })

			if (processMessageError !== undefined) {
				return c.text(processMessageError, { status: 400 })
			}

			checkNewChat({
				chat_id: chatId,
				user_message: userMessage,
				user,
			})

			const { model, error, providerOptions } = getModel({
				provider,
				searchGrounding,
			})

			if (error !== null) {
				return c.text(error, 400)
			}

			let headers = {}
			if (cookie === 'delete') {
				headers = {
					'Set-Cookie': serialize('session', '', {
						httpOnly: true,
						path: '/',
						secure: APP_ENV === 'production',
						sameSite: 'lax',
						expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
					}),
				}
			} else if (cookie === 'set') {
				headers = {
					'Set-Cookie': serialize('session', session.token, {
						httpOnly: true,
						path: '/',
						secure: APP_ENV === 'production',
						sameSite: 'lax',
						expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
					}),
				}
			}

			const key = nanoid()

			const streamKey = `llm:stream:${chatId}:${key}`

			const chatSessionKey = `session:${chatId}`

			const publisher = createRedis()

			const chunks: Extract<
				TextStreamPart<ToolSet>,
				{
					type:
						| 'text-delta'
						| 'reasoning'
						| 'source'
						| 'tool-call'
						| 'tool-call-streaming-start'
						| 'tool-call-delta'
						| 'tool-result'
				}
			>[] = []

			return createDataStreamResponse({
				headers: {
					...c.res.headers,
					...headers,
				},
				execute: async (dataStream) => {
					dataStream.writeMessageAnnotation({
						type: 'model',
						model: provider.model,
					})

					dataStream.writeData({
						type: 'message',
						message: 'Understanding prompt',
					})

					dataStream.writeData({
						type: 'message',
						message: 'Generating Response',
					})

					const additionalSystemPrompt = {
						chat: `
						YOU ARE NOT ALLOWED TO CALL ANY TOOLS, DONT USE PREVIOUS CHATS TO FAKE CALL TOOLS
						ONLY TREAT THIS AS TEXT TO TEXT CHAT

						You have also been given image generation tool, do not ask for confirmation, just relay the user request
						The tool can also take in an image url if its use for editing, please decide whether or not to include an image url based on the context
						Example: If an user ask to generate an image of a cat, then ask to give it clothes, please provide the image url for editing
						Another example: if an user ask to generate an image of a cat with transparent background
						Dont say back to the user you cant generate a transparent background 
						Just use the tool and let the user see the result themselves

						Remember to evaluate after using the tools
						
						IMPORTANT NOTES FOR IMAGE GENERATION TOOL: ONCE YOU RECEIVE THE FILES URL, THE IMAGE GENERATION IS CONSIDERED DONE
					`,
						x_search: `
						You have been given an ability to search X(formerly Twitter)'s posts
						'You MUST run the tool first exactly once'
						DO NOT ASK THE USER FOR CONFIRMATION!
					`,
						web_search: `
						You have been given a web search ability, 
						'You MUST run the tool first exactly once'
						DO NOT ASK THE USER FOR CONFIRMATION!
					`,
						academic_search: `
						You have been given an ability to search academic papers
						'You MUST run the tool first exactly once'
						DO NOT ASK THE USER FOR CONFIRMATION!
					`,
						web_reader: `
						You have been given an ability to fetch url as markdown 
						'You MUST run the tool first exactly once'
						DO NOT ASK THE USER FOR CONFIRMATION!
					`,
						image: `
						You have been given an ability to generate image 
						'You MUST run the tool first exactly once'
						USE 1:1 aspect ratio if not specified and 1 image as default unless specified
						DO NOT ASK THE USER FOR CONFIRMATION!
					`,
						'gpt-image-1': `
						You have been given an ability to generate image 
						'You MUST run the tool first exactly once'
						USE 1:1 aspect ratio if not specified and 1 image as default unless specified
						DO NOT ASK THE USER FOR CONFIRMATION!
					`,
					}

					const result = streamText({
						model: model,
						messages: coreMessages,
						system: `
						You are a chat assistant

						Today's Date: ${new Date().toLocaleDateString('en-US', {
							year: 'numeric',
							month: 'short',
							day: '2-digit',
							weekday: 'short',
						})}

						${
							name_for_llm
								? `The user has asked you to refer their name as ${name_for_llm}`
								: ''
						}

						Note: frontend has a tool to display mermaid code, 
						so you don't have to tell the user you don't have the ability to render mermaid code 
						or tell the user how to render them

						if a math equation is generated, wrap it around $$ for katex inline styling and $$ for block
						example:

						(inline)
						Pythagorean theorem: $$a^2+b^2=c^2$$

						(block)
						$$
						\mathcal{L}\{f\}(s) = \int_0^{\infty} {f(t)e^{-st}dt}
						$$

						DONT USE $$ UNLESS YOU NEED TO GENERATE MATH FORMULAS

						WRAP CODE AROUND \`IF INLINE\`
						WRAP CODE AROUND
						\`\`\`
						IF BLOCK
						\`\`\`
						You must put the programming language for codeblock so frontend can make correct syntax highlighting
						eg:
						\`\`\`javascript
						javascript code
						\`\`\`

						Do not generate tool call details to the user
						It is a must to generate some text, letting the user knows your thinking process before using a tool.
						Thus providing better user experience, rather than immediately jump to using the tool and generate a conclusion

						Common Order: Tool, Text
						Better order you must follow: Text, Tool, Text

						If the tools return an unauthenticated error due to user not logged in, please say the following to the user:
						"You must be logged in to use this feature, if you sign up we will give you 50 credits (worth $0.50)"

						${additionalSystemPrompt[mode]}

						${
							additional_system_prompt
								? `The user has also provided additional system prompt for you, here is the prompt: ${additional_system_prompt}`
								: ''
						}
					`,
						providerOptions: providerOptions,
						abortSignal: c.req.raw.signal,
						onChunk: ({ chunk }) => {
							chunks.push(chunk)
						},
						maxSteps: 5,
						// experimental_activeTools: [...activeTools(mode)],
						tools: {
							...tools(user, chatId, dataStream, mode, settings),
						},
						onStepFinish: (data) => {
							const metadata = data.providerMetadata?.google as
								| GoogleGenerativeAIProviderMetadata
								| undefined
							if (metadata) {
								// @ts-ignore
								dataStream.writeMessageAnnotation({
									type: 'google-grounding',
									data: metadata,
								})
							}
							// console.log(data)
							// console.log(
							// 	require('util').inspect(
							// 		data,
							// 		false,
							// 		null,
							// 		true /* enable colors */,
							// 	),
							// )
						},
						onError: (error) => {
							console.log('Error', error)
						},
						experimental_transform: smoothStream({
							delayInMs: 20, // optional: defaults to 10ms
							chunking: 'word', // optional: defaults to 'word'
						}),
						onFinish: async ({
							response,
							usage,
							reasoning,
							providerMetadata,
							finishReason,
						}) => {
							// const util = require('util')
							// console.log('on finish')
							// console.log(
							// 	util.inspect(response.messages, {
							// 		showHidden: false,
							// 		depth: null,
							// 		colors: true,
							// 	}),
							// )
							updateUserChatAndLimit({
								chatId,
								messages: response.messages,
								provider,
								providerMetadata,
								reasoning,
								user,
								usage,
								userMessage,
								userMessageDate,
								mode,
								response_id: response.id,
							})
						},
					})

					result.mergeIntoDataStream(dataStream, {
						sendReasoning: true,
					})

					await redis.xadd(
						streamKey,
						'*',
						...[
							'type',
							'"message_annotations"',
							'annotation',
							JSON.stringify({
								type: 'model',
								model: provider.model,
							}),
						],
					)

					let start = true
					for await (const stream of result.fullStream) {
						let values: string[] = []
						for (const key in stream) {
							// @ts-ignore
							if (!stream[key]) continue
							values.push(
								// @ts-ignore
								...[key, JSON.stringify(stream[key])],
							)
						}
						await redis.xadd(streamKey, '*', ...values)

						if (start) {
							await publisher.publish(
								chatSessionKey,
								JSON.stringify({
									message: 'message',
									id: key,
									data: messages[messages.length - 1],
									clientId: clientId,
								}),
							)
							start = false
						}
						await publisher.publish(
							streamKey,
							JSON.stringify({ type: 'chunk' }),
						)
					}

					await publisher.publish(
						streamKey,
						JSON.stringify({ type: 'finish' }),
					)
					await redis.expire(streamKey, 300)
				},
				onError: (error) => {
					publisher.publish(
						streamKey,
						JSON.stringify({ type: 'finish' }),
					)
					redis.expire(streamKey, 300)
					const responseMessages = mergeChunksToResponse(chunks)
					updateUserChatAndLimit({
						chatId,
						messages:
							responseMessages.length > 0
								? responseMessages
								: [
										{
											role: 'assistant',
											content: [{ type: 'text', text: '' }],
										},
									],
						provider,
						providerMetadata: {
							kon_chat:
								error instanceof APICallError
									? {
											status: 'error',
											error: {
												type: 'api_call_error',
												message:
													// @ts-ignore
													error.data?.error?.message ||
													'Error when generating response',
												error: error,
											},
										}
									: {
											status: 'error',
											error: {
												type: 'stopped_by_user',
												message: 'Stopped By User',
											},
										},
						},
						reasoning: undefined,
						user,
						usage: {
							completionTokens: 0,
							promptTokens: 0,
							totalTokens: 0,
						},
						userMessage,
						userMessageDate,
						mode,
						response_id: nanoid(),
					})
					// Error messages are masked by default for security reasons.
					// If you want to expose the error message to the client, you can do so here:
					console.log('Stream Error', error)
					return error instanceof Error
						? error.message
						: String(error)
				},
			})
		},
	)

	.post(
		'/:chat_id/resume',
		describeRoute({ tags: ['chat'] }),
		zValidator('json', z.object({ id: z.string() })),
		async (c) => {
			const { id } = c.req.valid('json')
			const chatId = c.req.param('chat_id')

			const subscription = createRedis()

			const streamKey = `llm:stream:${chatId}:${id}`
			const keyExists = await redis.exists(streamKey)

			if (!keyExists) {
				return c.json(
					{ error: 'Stream does not (yet) exist' },
					{ status: 412 },
				)
			}
			const groupName = `sse-group-${nanoid()}`

			await redis.xgroup('CREATE', streamKey, groupName, '0')

			return new Response(
				new ReadableStream({
					async start(controller) {
						const readStreamMessages = async () => {
							const chunks = (await redis.xreadgroup(
								'GROUP',
								groupName,
								'consumer-1',
								'STREAMS',
								streamKey,
								'>',
							)) as any[]

							if (chunks?.length > 0) {
								const [_streamKey, messages] = chunks[0]
								for (const [_messageId, fields] of messages) {
									const chunk = arrToObj(
										fields,
									) as TextStreamPart<ToolSet>

									const chunkType = chunk.type
									// @ts-ignore
									if (chunkType == 'message_annotations') {
										controller.enqueue(
											formatDataStreamPart(
												'message_annotations',
												// @ts-ignore
												[chunk.annotation],
											),
										)
									} else if (chunkType == 'text-delta') {
										controller.enqueue(
											formatDataStreamPart('text', chunk.textDelta),
										)
									} else if (chunkType == 'reasoning') {
										controller.enqueue(
											formatDataStreamPart(
												'reasoning',
												chunk.textDelta,
											),
										)
									} else if (chunkType == 'redacted-reasoning') {
										controller.enqueue(
											formatDataStreamPart('redacted_reasoning', {
												data: chunk.data,
											}),
										)
									} else if (chunkType == 'reasoning-signature') {
										controller.enqueue(
											formatDataStreamPart('reasoning_signature', {
												signature: chunk.signature,
											}),
										)
									} else if (chunkType == 'file') {
										controller.enqueue(
											formatDataStreamPart('file', {
												mimeType: chunk.mimeType,
												data: chunk.base64,
											}),
										)
									} else if (chunkType == 'source') {
										controller.enqueue(
											formatDataStreamPart('source', chunk.source),
										)
									} else if (
										chunkType == 'tool-call-streaming-start'
									) {
										controller.enqueue(
											formatDataStreamPart(
												'tool_call_streaming_start',
												{
													toolCallId: chunk.toolCallId,
													toolName: chunk.toolName,
												},
											),
										)
									} else if (chunkType == 'tool-call-delta') {
										controller.enqueue(
											formatDataStreamPart('tool_call_delta', {
												toolCallId: chunk.toolCallId,
												argsTextDelta: chunk.argsTextDelta,
											}),
										)
									} else if (chunkType == 'tool-call') {
										controller.enqueue(
											formatDataStreamPart('tool_call', {
												toolCallId: chunk.toolCallId,
												toolName: chunk.toolName,
												args: chunk.args,
											}),
										)
									}
									// @ts-ignore
									else if (chunkType == 'tool-result') {
										controller.enqueue(
											formatDataStreamPart('tool_result', {
												// @ts-ignore
												toolCallId: chunk.toolCallId,
												// @ts-ignore
												result: chunk.result,
											}),
										)
									} else if (chunkType == 'error') {
										controller.enqueue(
											formatDataStreamPart(
												'error',
												'An Error Occured',
												// getErrorMessage(chunk.error),
											),
										)
									} else if (chunkType == 'step-start') {
										controller.enqueue(
											formatDataStreamPart('start_step', {
												messageId: chunk.messageId,
											}),
										)
									} else if (chunkType == 'step-finish') {
										controller.enqueue(
											formatDataStreamPart('finish_step', {
												finishReason: chunk.finishReason,
												usage: {
													promptTokens: chunk.usage.promptTokens,
													completionTokens:
														chunk.usage.completionTokens,
												},
												isContinued: chunk.isContinued,
											}),
										)
									} else if (chunkType == 'finish') {
										controller.enqueue(
											formatDataStreamPart('finish_message', {
												finishReason: chunk.finishReason,
												usage: {
													promptTokens: chunk.usage.promptTokens,
													completionTokens:
														chunk.usage.completionTokens,
												},
											}),
										)
									} else {
										const exhaustiveCheck: never = chunkType
										throw new Error(
											`Unknown chunk type: ${exhaustiveCheck}`,
										)
									}
								}
							}
						}

						try {
							await readStreamMessages()

							subscription.subscribe(streamKey)
							subscription.on('message', async (channel, message) => {
								if (channel === streamKey) {
									const type = JSON.parse(message).type
									await readStreamMessages()
									if (type === 'finish') {
										subscription.unsubscribe(streamKey)
										controller.close()
									}
								}
							})

							subscription.on('error', (error) => {
								console.error(
									`SSE subscription error on ${streamKey}:`,
									error,
								)
								controller.close()
							})

							c.req.raw.signal.addEventListener('abort', () => {
								console.log(
									'Client disconnected, cleaning up subscription',
								)
								subscription.unsubscribe(streamKey)
								controller.close()
							})
						} catch (error) {
							console.error(error)
						}
					},
				}),
				{
					headers: {
						'Content-Type': 'text/plain',
						// 'Cache-Control': 'no-cache, no-transform',
						// Connection: 'keep-alive',
					},
				},
			)
		},
	)

	.delete(
		'/:chat_id',
		describeRoute({ tags: ['chat'] }),
		async (c) => {
			const chatId = c.req.param('chat_id')

			const user = c.get('user')

			if (!user) return c.json({ success: false })

			const existingChat = await db.query.chat.findFirst({
				where: (chat, { eq, and }) =>
					and(eq(chat.id, chatId), eq(chat.userId, user.id)),
				with: {
					messages: true,
				},
			})

			if (!existingChat) return c.json({ success: false })

			await db
				.delete(chat)
				.where(and(eq(chat.id, chatId), eq(chat.userId, user.id)))

			const delete_messages = await db
				.delete(message)
				.where(eq(message.chatId, chatId))
				.returning()

			const attachments = getUploadIDsFromMessages(delete_messages)

			const deleted_uploads = await db
				.delete(upload)
				.where(
					and(
						inArray(upload.id, attachments),
						eq(upload.userId, user.id),
					),
				)
				.returning()

			await Promise.all(
				deleted_uploads.map(async (upload) => {
					const s3file = s3Client.file(upload.key)
					await s3file.delete()
				}),
			)

			return c.json({ success: true })
		},
	)

	.post(
		'/:chat_id/upload',
		describeRoute({ tags: ['chat'] }),
		zValidator(
			'form',
			z.object({
				file: z
					.instanceof(File)
					.refine((file) => file.size <= 5 * 1024 * 1024, {
						message: 'File size should be less than 5MB',
					})
					// Update the file type based on the kind of files you want to accept
					.refine(
						(file) =>
							[
								'image/jpeg',
								'image/png',
								'application/pdf',
								// 'text/csv',
								// 'text/plain',
							].includes(file.type),
						{
							message: 'File type not supported',
						},
					),
			}),
		),
		async (c) => {
			const chatId = c.req.param('chat_id')

			const user = c.get('user')

			if (!user) {
				return c.json({ link: '' }, 401)
			}

			const existingChat = await db.query.chat.findFirst({
				where: (chat, t) => t.eq(chat.id, chatId),
			})

			if (existingChat && existingChat.userId !== user.id) {
				return c.text('Unauthenticated Upload', 401)
			}

			let userChat = existingChat
			if (!userChat) {
				userChat = {
					id: chatId,
					title: 'New Chat',
					userId: user.id,
					visibility: 'private',
					createdAt: Date.now(),
					updatedAt: Date.now(),
				}
				await db.insert(chat).values(userChat)
			}

			const file = c.req.valid('form').file

			const id = `${user.id}/chat/${chatId}/upload/${nanoid()}-${
				file.name
			}`
			const s3file = s3Client.file(id)

			await s3file.write(file)

			const uploadId = nanoid() + `.${file.type.split('/').pop()}`
			await db.insert(upload).values({
				id: uploadId,
				userId: user.id,
				key: id,
				mimeType: file.type,
				name: file.name,
				size: file.size,
				visibility: userChat.visibility,
				createdAt: Date.now(),
			})

			return c.json({ id: uploadId })
		},
	)

	.put(
		'/:chat_id/change_visibility',
		describeRoute({ tags: ['chat'] }),
		zValidator(
			'json',
			z.object({
				visibility: z.enum(['private', 'public']),
			}),
		),
		async (c) => {
			const user = c.get('user')

			if (!user) {
				return c.json({ link: '' }, 401)
			}

			const chat_id = c.req.param('chat_id')

			const { visibility } = c.req.valid('json')

			const existingChat = await db.query.chat.findFirst({
				where: (chat, t) =>
					t.and(t.eq(chat.id, chat_id), t.eq(chat.userId, user.id)),
				with: {
					messages: true,
				},
			})

			if (existingChat) {
				await db
					.update(chat)
					.set({
						visibility: visibility,
					})
					.where(and(eq(chat.id, chat_id), eq(chat.userId, user.id)))

				const attachments = getUploadIDsFromMessages(
					existingChat.messages,
				)

				await db
					.update(upload)
					.set({
						visibility: visibility,
					})
					.where(
						and(
							inArray(upload.id, attachments),
							eq(upload.userId, user.id),
						),
					)
			}

			return c.json({ success: true }, 200)
		},
	)

	.post(
		'/:chat_id/copy',
		describeRoute({ tags: ['chat'] }),
		async (c) => {
			const user = c.get('user')

			if (!user) {
				return c.json({ id: '' }, 401)
			}

			const chat_id = c.req.param('chat_id')

			const existingChat = await db.query.chat.findFirst({
				where: (chat, t) =>
					t.and(
						t.eq(chat.id, chat_id),
						t.or(
							t.eq(chat.userId, user.id),
							t.eq(chat.visibility, 'public'),
						),
					),
				with: {
					messages: {
						orderBy: (messages, t) => [t.asc(messages.createdAt)],
					},
				},
			})

			if (!existingChat) return c.json({ id: '' }, 404)

			const attachments = getUploadIDsFromMessages(
				existingChat.messages,
			)

			const newChatId = nanoid()

			await db.insert(chat).values({
				id: newChatId,
				title: existingChat.title,
				userId: user.id,
				visibility: 'private',
				createdAt: Date.now(),
			})

			const uploads = await db.query.upload.findMany({
				where: (upload, t) =>
					t.and(t.inArray(upload.id, attachments)),
			})

			const uploadsData = await Promise.all(
				uploads.map(async (upload) => {
					const existing = s3Client.file(upload.key)

					const copyId = `${
						user.id
					}/chat/${newChatId}/upload/${nanoid()}-${upload.name}`

					const uploadId =
						nanoid() + `.${upload.mimeType.split('/').pop()}`
					const copy = s3Client.file(copyId)

					await copy.write(existing)
					return {
						originalId: upload.id,
						id: uploadId,
						name: upload.name,
						createdAt: Date.now(),
						userId: user.id,
						key: copyId,
						size: upload.size,
						mimeType: upload.mimeType,
						visibility: 'private' as const,
					}
				}),
			)

			if (existingChat.messages.length > 0) {
				const now = Date.now()
				await db.insert(message).values(
					existingChat.messages.map((message, index) => {
						return {
							...message,
							id: nanoid(),
							chatId: newChatId,
							createdAt: now + index,
							content: replaceAttachment(message, uploadsData),
						}
					}),
				)
			}

			if (uploadsData.length > 0) {
				await db.insert(upload).values([...uploadsData])
			}

			return c.json({ id: newChatId }, 200)
		},
	)

export { app as ChatRoutes }
