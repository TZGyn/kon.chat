import {
	type AssistantContent,
	convertToCoreMessages,
	type CoreAssistantMessage,
	type CoreSystemMessage,
	type CoreToolMessage,
	type CoreUserMessage,
	type ToolInvocation,
} from 'ai'
import { getMostRecentUserMessage } from './utils'
import { modelSchema } from './model'
import { z } from 'zod'
import { db } from './db'
import { generateTitleFromUserMessage } from './ai/utils'
import { chat } from './db/schema'
import { validateSessionToken } from './auth/session'

export const processMessages = ({
	messages,
	provider,
}: {
	messages: any[]
	provider: z.infer<typeof modelSchema>
}) => {
	// console.log(
	// 	inspect(messages, false, null, true /* enable colors */),
	// )
	messages = messages
		.map((message) => ({
			...message,
			toolInvocations:
				message.toolInvocations?.filter((tool: ToolInvocation) => {
					return 'result' in tool
				}) || [],
			parts:
				message.parts?.filter((part: any) => {
					if (part.type === 'reasoning' && !part.reasoning)
						return false
					if (part.type !== 'tool-invocation') return true
					if (!('toolInvocation' in part)) return false
					return 'result' in part.toolInvocation
				}) || [],
		}))
		.filter((message) => message.parts.length !== 0)
	let coreMessages = convertToCoreMessages(messages)
	const userMessage = getMostRecentUserMessage(coreMessages)
	const userMessageDate = Date.now()

	coreMessages = coreMessages.flatMap((message) => {
		if (message.role === 'user') {
			return [
				{
					...message,
					content:
						typeof message.content === 'string'
							? message.content
							: message.content.flatMap((content) => {
									if (content.type === 'image') {
										if (
											content.image instanceof URL &&
											Bun.env.APP_URL &&
											content.image.origin === Bun.env.APP_URL
										) {
											return [
												{
													type: 'text',
													text: 'Image Link: ' + content.image,
												},
												content,
											]
										}
									}
									return [content]
								}),
				},
			]
		} else {
			if (
				message.role === 'assistant' &&
				provider.name === 'mistral' &&
				typeof message.content !== 'string'
			) {
				return {
					...message,
					content: [
						...message.content.map((message) => ({
							...message,
							toolCallId: 'abcdefghi',
						})),
					],
				}
			}
			if (message.role === 'tool') {
				if (
					message.content[0]?.toolName === 'image_generation' &&
					message.content[0].result &&
					'files' in
						(message.content[0].result as {
							files?: string[]
							error?: any
						})
				) {
					const files = (
						message.content[0].result as { files: string[] }
					).files.filter(
						(url) =>
							Bun.env.APP_URL && url.startsWith(Bun.env.APP_URL),
					)

					if (files.length <= 0) {
						return [message] as (
							| CoreSystemMessage
							| CoreAssistantMessage
							| CoreToolMessage
							| CoreUserMessage
						)[]
					}

					return [
						provider.name === 'mistral'
							? {
									...message,
									content: [
										...message.content.map((message) => ({
											...message,
											toolCallId: 'abcdefghi',
										})),
									],
								}
							: message,
						provider.name === 'mistral'
							? {
									role: 'assistant',
									content: [
										...files.flatMap((file) => {
											return [
												{
													type: 'text',
													text: 'Generated Images From Image Generation Tool',
												},
												{
													type: 'file',
													data: file,
													mimeType: 'image/png',
												},
											] as Exclude<AssistantContent, string>
										}),
									],
								}
							: {
									role: 'user',
									content: [
										...files.flatMap((file) => {
											return [
												{
													type: 'text' as const,
													text: 'Generated Images From Image Generation Tool',
												},
												{
													type: 'image' as const,
													image: file,
												},
											]
										}),
									],
								},
					] as (
						| CoreSystemMessage
						| CoreAssistantMessage
						| CoreToolMessage
						| CoreUserMessage
					)[]
				}
				return [
					{
						...message,
						content: message.content.filter((content) => {
							if (!content.result) return false
							return true
						}),
					},
				] as (
					| CoreSystemMessage
					| CoreAssistantMessage
					| CoreToolMessage
					| CoreUserMessage
				)[]
			}
			return [message]
		}
	})

	if (!userMessage) {
		return { error: 'No User Message' }
	}

	if (
		provider.name === 'groq' ||
		provider.name === 'xai' ||
		(provider.name === 'open_router' &&
			(provider.model === 'meta-llama/llama-4-maverick:free' ||
				provider.model === 'meta-llama/llama-4-scout:free')) ||
		provider.name === 'mistral'
	) {
		coreMessages = coreMessages.map((message) => {
			if (message.role === 'user') {
				if (Array.isArray(message.content)) {
					return {
						...message,
						content: message.content.filter((content) => {
							if (content.type === 'text') return true
							return false
						}),
					}
				} else {
					return message
				}
			}
			return message
		})
	}

	if (provider.name !== 'anthropic') {
		coreMessages = coreMessages.map((message) => {
			if (message.role === 'user') {
				if (Array.isArray(message.content)) {
					return {
						...message,
						content: message.content.filter((content) => {
							if (content.type === 'file') return false
							return true
						}),
					}
				} else {
					return message
				}
			}
			return message
		})
	}

	coreMessages = [
		...coreMessages.map((message) => {
			if (
				message.role === 'assistant' &&
				typeof message.content !== 'string'
			) {
				return {
					...message,
					content: message.content
						.filter(
							(content) =>
								content.type !== 'reasoning' &&
								content.type !== 'redacted-reasoning',
						)
						.map((message) => {
							if (message.type === 'text') {
								return {
									...message,
									text:
										message.text ||
										'/*LLM DID NOT GENERATE ANY RESPONSE*/',
								}
							}
							return message
						}),
				}
			}
			return message
		}),
	]
	return { coreMessages, userMessage, userMessageDate }
}

export const checkNewChat = async ({
	chat_id,
	user_message,
	token,
}: {
	chat_id: string
	token: string
	user_message: CoreUserMessage
}) => {
	const { session, user: loggedInUser } =
		await validateSessionToken(token)

	if (!loggedInUser) return

	const existingChat = await db.query.chat.findFirst({
		where: (chat, { eq, and }) => and(eq(chat.id, chat_id)),
	})

	if (!existingChat) {
		const title = await generateTitleFromUserMessage({
			message: user_message,
		})

		await db.insert(chat).values({
			id: chat_id,
			title: title,
			userId: loggedInUser.id,
			createdAt: Date.now(),
			updatedAt: Date.now(),
		})
	}
}
