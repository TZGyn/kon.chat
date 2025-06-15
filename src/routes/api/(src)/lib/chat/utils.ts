import { type Tool } from '$api/ai/tools'
import {
	generateTitleFromUserMessage,
	sanitizeResponseMessages,
} from '$api/ai/utils'
import { validateSessionToken } from '$api/auth/session'
import { db } from '$api/db'
import { chat, message } from '$api/db/schema'
import { type Provider } from '$api/model'
import { updateUserRatelimit } from '$api/ratelimit'
import { nanoid } from '$api/utils'
import {
	type CoreAssistantMessage,
	type CoreToolMessage,
	type CoreUserMessage,
	generateId,
	type LanguageModelUsage,
	type AssistantContent,
	type TextStreamPart,
	type ToolContent,
	type ToolSet,
} from 'ai'
import { and, eq } from 'drizzle-orm'

export const updateUserChatAndLimit = async ({
	token,
	chatId,
	userMessage,
	userMessageDate,
	messages,
	reasoning,
	provider,
	providerMetadata,
	usage,
	mode,
	response_id,
}: {
	token: string
	chatId: string
	userMessage: CoreUserMessage
	userMessageDate: number
	messages: Array<CoreToolMessage | CoreAssistantMessage>
	reasoning: string | undefined
	provider: Provider
	providerMetadata: any | undefined
	usage: LanguageModelUsage
	mode: Tool
	response_id: string
}) => {
	const { session, user: loggedInUser } =
		await validateSessionToken(token)

	if (!loggedInUser) return

	const existingChat = await db.query.chat.findFirst({
		where: (chat, { eq, and }) => and(eq(chat.id, chatId)),
	})

	let newChat = false
	if (!existingChat) {
		const title = await generateTitleFromUserMessage({
			message: userMessage,
		})

		await db.insert(chat).values({
			id: chatId,
			title: title,
			userId: loggedInUser.id,
			createdAt: Date.now(),
			updatedAt: Date.now(),
		})

		newChat = true
	}

	if (existingChat && existingChat.title === 'New Chat') {
		const title = await generateTitleFromUserMessage({
			message: userMessage,
		})
		await db
			.update(chat)
			.set({
				title: title,
			})
			.where(
				and(
					eq(chat.userId, loggedInUser.id),
					eq(chat.id, existingChat.id),
				),
			)
	}

	if (
		(existingChat && existingChat.userId === loggedInUser.id) ||
		newChat
	) {
		if (!newChat) {
			await db
				.update(chat)
				.set({ updatedAt: Date.now() })
				.where(eq(chat.id, existingChat!.id))
		}

		await db.insert(message).values({
			...userMessage,
			responseId: nanoid(),
			id: generateId(),
			chatId: chatId,
			promptTokens: 0,
			completionTokens: 0,
			totalTokens: 0,
			createdAt: userMessageDate,
		})

		const responseMessagesWithoutIncompleteToolCalls =
			sanitizeResponseMessages({
				messages: messages,
				reasoning,
			})

		const now = Date.now()

		await db.insert(message).values(
			responseMessagesWithoutIncompleteToolCalls.map(
				(message, index) => {
					const messageId = generateId()
					const date = now + index

					return {
						id: messageId,
						chatId: chatId,
						responseId: response_id,
						role: message.role,
						content: message.content,
						model: provider.model,
						provider: provider.name,
						providerMetadata:
							message.role === 'assistant'
								? providerMetadata
								: undefined,
						completionTokens: usage.completionTokens || 0,
						promptTokens: usage.promptTokens || 0,
						totalTokens: usage.totalTokens || 0,
						createdAt: date,
					}
				},
			),
		)
	}

	await updateUserRatelimit({
		provider,
		user: loggedInUser,
		mode,
	})
}

export const updateUserLimit = async ({
	token,
	provider,
}: {
	token: string
	provider: Provider
}) => {
	const { session, user: loggedInUser } =
		await validateSessionToken(token)

	if (!loggedInUser) return

	await updateUserRatelimit({
		provider,
		user: loggedInUser,
		mode: 'chat',
	})
}

export const mergeChunksToResponse = (
	chunks: Extract<
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
	>[],
) => {
	type ResponseMessage = CoreAssistantMessage | CoreToolMessage
	const responseMessages: ResponseMessage[] = []

	let currentAssistantContent: Exclude<AssistantContent, string> = []
	let currentToolContent: ToolContent = []
	let textDelta = ''
	let reasoningDelta = ''
	let toolcall:
		| {
				toolCallId: string
				toolName: string
				args: any
		  }
		| undefined = undefined
	let toolResult:
		| {
				toolCallId: string
				toolName: string
				args: any
				result: any
		  }
		| undefined = undefined
	let currentType:
		| 'tool-call'
		| 'tool-result'
		| 'text-delta'
		| 'reasoning'
		| 'source'
		| 'tool-call-streaming-start'
		| 'tool-call-delta'
		| undefined = undefined

	for (const chunk of chunks) {
		if (chunk.type !== currentType) {
			if (currentType === 'text-delta') {
				currentAssistantContent.push({
					type: 'text',
					text: textDelta,
				})
			}
			if (currentType === 'reasoning') {
				currentAssistantContent.push({
					type: 'reasoning',
					text: reasoningDelta,
				})
			}
			if (currentType === 'tool-call') {
				if (toolcall) {
					currentAssistantContent.push({
						type: 'tool-call',
						...toolcall,
					})
				}
			}

			// @ts-ignore
			if (currentType === 'tool-result') {
				if (toolResult) {
					currentToolContent.push({
						type: 'tool-result',
						...toolResult,
					})
				}
			}

			if (currentType) {
				if (
					// @ts-ignore
					chunk.type === 'tool-result' &&
					// @ts-ignore
					currentType !== 'tool-result'
				) {
					responseMessages.push({
						role: 'assistant',
						content: [...currentAssistantContent],
					})
					// @ts-ignore
					currentAssistantContent = []
				}
				if (
					// @ts-ignore
					chunk.type !== 'tool-result' &&
					// @ts-ignore
					currentType === 'tool-result'
				) {
					responseMessages.push({
						role: 'tool',
						content: [...currentToolContent],
					})
					// @ts-ignore
					currentToolContent = []
				}
			}

			textDelta = ''
			reasoningDelta = ''
			toolcall = undefined
			currentType = chunk.type
		}
		if (chunk.type === 'text-delta') {
			textDelta += chunk.textDelta
		}
		if (chunk.type === 'reasoning') {
			reasoningDelta += chunk.textDelta
		}
		if (chunk.type === 'tool-call') {
			toolcall = {
				args: chunk.args,
				toolCallId: chunk.toolCallId,
				toolName: chunk.toolName,
			}
		}
		// @ts-expect-error
		if (chunk.type === 'tool-result') {
			toolResult = {
				// @ts-expect-error
				args: chunk.args,
				// @ts-expect-error
				toolCallId: chunk.toolCallId,
				// @ts-expect-error
				toolName: chunk.toolName,
				// @ts-expect-error
				result: chunk.result,
			}
		}
	}

	if (currentType) {
		// @ts-ignore
		if (currentType === 'tool-result') {
			responseMessages.push({
				role: 'tool',
				content: [
					...currentToolContent,
					{
						type: 'tool-result',
						...toolResult!,
					},
				],
			})
		} else {
			const finalContent = currentAssistantContent
			if (currentType === 'reasoning') {
				finalContent.push({ type: 'reasoning', text: reasoningDelta })
			}
			if (currentType === 'text-delta') {
				finalContent.push({ type: 'text', text: textDelta })
			}
			if (currentType === 'tool-call') {
				finalContent.push({ type: 'tool-call', ...toolcall! })
			}
			responseMessages.push({
				role: 'assistant',
				content: finalContent,
			})
		}
	}

	// const util = require('util')
	// console.log(
	// 	util.inspect(responseMessages, {
	// 		showHidden: false,
	// 		depth: null,
	// 		colors: true,
	// 	}),
	// )
	return responseMessages
}
