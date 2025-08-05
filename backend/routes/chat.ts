import {
	APICallError,
	createDataStreamResponse,
	smoothStream,
	streamText,
	formatDataStreamPart,
	type TextStreamPart,
	type ToolSet,
	generateObject,
	convertToCoreMessages,
} from 'ai'
import { z } from 'zod'

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
import type { auth, AuthType } from '$api/auth'
import { systemPrompt } from '$api/ai/system-prompt'
import { resumeStream } from '$api/chat/resume-stream'
import { createOpenAI } from '@ai-sdk/openai'

function getErrorMessage(error: unknown | undefined) {
	if (error == null) {
		return 'unknown error'
	}

	if (typeof error === 'string') {
		return error
	}

	if (error instanceof Error) {
		return error.message
	}

	return JSON.stringify(error)
}

const app = new Hono<{
	Variables: AuthType
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

	.post(
		'/suggestions',
		describeRoute({ tags: ['chat'] }),
		zValidator(
			'json',
			z.object({
				messages: z.any(),
			}),
		),
		async (c) => {
			const setting = c.get('setting')
			const { messages } = c.req.valid('json')

			const openai = createOpenAI({
				apiKey: setting.openAIApiKey!,
			})

			let coreMessages = convertToCoreMessages(messages)
			coreMessages = coreMessages.map((message) => {
				if (message.role !== 'assistant') return message
				if (typeof message.content === 'string') return message

				return {
					...message,
					content: message.content.filter((content) => {
						return content.type === 'text'
					}),
				}
			})

			const { object } = await generateObject({
				model: openai('gpt-4.1-nano'),
				maxTokens: 512,
				system: `
					You will be given a question and a response from a LLM chat
					Based on the messages, you will:

					- Generate 4 prompt suggestions
					- Do not repeat the same prompt

					There are tools where you can also suggest to call:
					- Currency converter
					- Stock Charts
					- Image Generator
					- Web page reader (give an url)
					- Web search
					- Academic search

					For these tools, your suggestions dont have to be direct like "call currency converter to convert USD to YEN".
					Instead, you should just suggest "Convert 100 USD to YEN", the tools will be automatically picked up without directly specifying it.
				`,
				messages,
				schema: z.object({
					suggestions: z
						.array(z.string())
						.describe('The generated suggestions'),
				}),
			})

			return c.json(object)
		},
	)

	.get('/:chat_id', describeRoute({ tags: ['chat'] }), async (c) => {
		const chatId = c.req.param('chat_id')

		const user = c.get('user')

		const chat = await db.query.chat.findFirst({
			where: (chat, { eq, and, or }) => eq(chat.id, chatId),
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

		if (!chat) return c.json({ chat: null })

		if (chat.userId !== user.id) {
			if (chat.visibility === 'private') return c.json({ chat: null })

			const { userId: chatUserId, ...rest } = chat

			return c.json({
				chat: { ...rest, isOwner: false },
			})
		}

		const { userId: chatUserId, ...rest } = chat

		return c.json({
			chat: { ...rest, isOwner: true },
		})
	})

	.get('/:chat_id/active_streams', async (c) => {
		const chatId = c.req.param('chat_id')

		const key = `active_streams:${chatId}`

		const activeStreams = JSON.parse(
			(await redis.get(key)) || '[]',
		) as any[]

		return c.json({
			activeStreams,
		})
	})

	.post(
		'/:chat_id/cancel_stream',
		describeRoute({ tags: ['chat'] }),
		zValidator('json', z.object({ id: z.string() })),
		async (c) => {
			const chatId = c.req.param('chat_id')
			const { id } = c.req.valid('json')

			const streamKey = `llm:stream:${chatId}:${id}`
			const publisher = createRedis()

			await publisher.publish(
				streamKey,
				JSON.stringify({ type: 'cancel' }),
			)

			return c.json({})
		},
	)

	.post(
		'/:chat_id',
		describeRoute({ tags: ['chat'] }),
		zValidator(
			'json',
			z.object({
				messages: z.any(),
				provider: modelSchema,
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
			}),
		),
		async (c) => {
			const {
				messages,
				provider,
				additional_system_prompt,
				name_for_llm,
			} = c.req.valid('json')

			const chatId = c.req.param('chat_id')

			const user = c.get('user')

			const setting = c.get('setting')

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
				api_key: setting.openAIApiKey!,
			})

			const { model, error, providerOptions } = getModel({
				provider,
				searchGrounding: false,
			})

			if (error !== null) {
				return c.text(error, 400)
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

			const abortController = new AbortController()

			const subscription = createRedis()

			subscription.subscribe(streamKey)
			subscription.on('message', async (channel, message) => {
				if (channel === streamKey) {
					const type = JSON.parse(message).type
					if (type === 'cancel') {
						abortController.abort()
					}
				}
			})

			try {
				const writeMessageAnnotation = async (value: any) => {
					await redis.xadd(
						streamKey,
						'*',
						...[
							'type',
							'"message_annotations"',
							'annotation',
							JSON.stringify(value),
						],
					)
				}
				const result = streamText({
					model: model,
					messages: coreMessages,
					system: systemPrompt({
						additional_system_prompt,
						name_for_llm,
					}),
					providerOptions: providerOptions,
					abortSignal: abortController.signal,
					onChunk: ({ chunk }) => {
						chunks.push(chunk)
					},
					maxSteps: 5,
					// experimental_activeTools: [...activeTools(mode)],
					tools: tools(user, chatId, writeMessageAnnotation, setting),
					onStepFinish: (data) => {},
					onError: (error) => {
						console.log('Error', error)

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
								kon_chat: {
									status: 'error',
									error: {
										type: 'api_call_error',
										message:
											// @ts-ignore
											error.error?.message ||
											'Error when generating response',
										error: error,
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
							response_id: nanoid(),
							apiKey: setting.openAIApiKey!,
						})
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
							response_id: response.id,
							apiKey: setting.openAIApiKey!,
						})
					},
				})

				const processStream = async () => {
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

					try {
						let start = true
						for await (const stream of result.fullStream) {
							let values: string[] = []
							if (abortController.signal.aborted) {
								throw Error('Stopped By User')
							}
							if (stream.type === 'error') {
								values.push(
									...[
										'type',
										'"error"',
										'error',
										`"${getErrorMessage(stream.error)}"`,
									],
								)
							} else {
								for (const key in stream) {
									// @ts-ignore
									if (!stream[key]) continue
									values.push(
										// @ts-ignore
										...[key, JSON.stringify(stream[key])],
									)
								}
							}
							await redis.xadd(streamKey, '*', ...values)

							if (start) {
								const activeStreamsKey = `active_streams:${chatId}`

								const activeStreams = JSON.parse(
									(await redis.get(activeStreamsKey)) || '[]',
								) as any[]

								activeStreams.push({
									id: key,
									message: messages[messages.length - 1],
								})
								await redis.set(
									activeStreamsKey,
									JSON.stringify(activeStreams),
								)

								await publisher.publish(
									chatSessionKey,
									JSON.stringify({
										message: 'message',
										id: key,
										data: messages[messages.length - 1],
									}),
								)

								await publisher.publish(
									`user:${user.id}:events`,
									JSON.stringify({
										type: 'new-message',
										chatId: chatId,
										id: key,
										data: messages[messages.length - 1],
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
					} catch (error) {
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
								kon_chat: {
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
							response_id: nanoid(),
							apiKey: setting.openAIApiKey!,
						})
						console.log('Catching', error)
					} finally {
						const activeStreamsKey = `active_streams:${chatId}`
						const activeStreams = JSON.parse(
							(await redis.get(activeStreamsKey)) || '[]',
						) as any[]
						await redis.set(
							activeStreamsKey,
							JSON.stringify(
								activeStreams.filter((stream) => stream.id !== key),
							),
						)
					}
				}

				processStream()
			} catch (error) {
				publisher.publish(
					streamKey,
					JSON.stringify({ type: 'finish' }),
				)
				redis.expire(streamKey, 300)
				const responseMessages = mergeChunksToResponse(chunks)
				console.log(responseMessages)
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
					response_id: nanoid(),
					apiKey: setting.openAIApiKey!,
				})
				// Error messages are masked by default for security reasons.
				// If you want to expose the error message to the client, you can do so here:
				console.log('Stream Error', error)
			}

			return c.json({ messageId: key }, 200)
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
						try {
							await resumeStream({
								groupName,
								streamKey,
								controller,
							})

							subscription.subscribe(streamKey)
							subscription.on('message', async (channel, message) => {
								if (channel === streamKey) {
									const type = JSON.parse(message).type
									await resumeStream({
										groupName,
										streamKey,
										controller,
									})
									if (type === 'cancel') {
										controller.enqueue(
											formatDataStreamPart(
												'error',
												'Stopped By User',
											),
										)
										subscription.unsubscribe(streamKey)
										controller.close()
									}
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
