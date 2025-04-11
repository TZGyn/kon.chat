import type { Attachment, CoreToolMessage } from 'ai'
import { type Message } from '@ai-sdk/svelte'
import {
	type CreateMessage,
	type FileUIPart,
	type ReasoningUIPart,
	type SourceUIPart,
	type TextUIPart,
	type ToolInvocation,
	type ToolInvocationUIPart,
	type UIMessage,
} from '@ai-sdk/ui-utils'

export function convertToUIMessages(
	messages: Array<{
		model: string | null
		provider: string | null
		id: string
		responseId: string
		createdAt: number
		content: unknown
		role: string
		providerMetadata: any
		chatId: string
		experimental_attachments?: Attachment[]
		parts?: (
			| TextUIPart
			| ToolInvocationUIPart
			| ReasoningUIPart
			| SourceUIPart
		)[]
	}>,
): Array<Message & { responseId: string }> {
	return messages.reduce(
		(
			chatMessages: Array<Message & { responseId: string }>,
			message,
			index,
		) => {
			if (message.role === 'tool') {
				const prev = chatMessages.pop()
				if (prev) {
					chatMessages.push({
						...prev,
						parts: prev.parts
							? [
									...prev.parts.map((part) => {
										if (part.type !== 'tool-invocation') return part

										const toolResult = (
											message as CoreToolMessage
										).content.find(
											(tool) =>
												tool.toolCallId ===
												part.toolInvocation.toolCallId,
										)
										if (toolResult) {
											return {
												type: 'tool-invocation',
												toolInvocation: {
													...part.toolInvocation,
													state: 'result',
													result: toolResult.result,
												},
											} as ToolInvocationUIPart
										}
										return {
											toolInvocation: part.toolInvocation,
											type: 'tool-invocation',
										} as ToolInvocationUIPart
									}),
								]
							: undefined,
					})
				}
				return chatMessages
			}

			let textContent = ''
			let attachments: Array<Attachment> = []
			let parts: (
				| TextUIPart
				| ReasoningUIPart
				| ToolInvocationUIPart
				| SourceUIPart
			)[] = []

			if (typeof message.content === 'string') {
				textContent += message.content
				parts.push({
					type: 'text',
					text: message.content,
				})
			} else if (Array.isArray(message.content)) {
				for (const content of message.content) {
					if (content.type === 'text') {
						textContent += content.text
						parts.push({
							type: 'text' as const,
							text: content.text,
						})
					} else if (content.type === 'reasoning') {
						// reasoningContent += content.reasoning ?? ''
						parts.push({
							type: 'reasoning' as const,
							reasoning: content.reasoning || content.text,
							details: [
								{
									type: 'text' as const,
									text: content.reasoning || content.text,
								},
							],
						})
					} else if (content.type === 'tool-call') {
						// toolInvocations.push({
						// 	state: 'call',
						// 	toolCallId: content.toolCallId,
						// 	toolName: content.toolName,
						// 	args: content.args,
						// })
						parts.push({
							type: 'tool-invocation' as const,
							toolInvocation: {
								state: 'call',
								toolCallId: content.toolCallId,
								toolName: content.toolName,
								args: content.args,
							},
						})
					} else if (content.type === 'image') {
						const filename = (content.image as string)
							.split('/')
							.pop()
						if (!filename) continue
						const filetype = filename.split('.').pop()
						if (
							filetype === 'png' ||
							filetype === 'jpg' ||
							filetype === 'jpeg'
						) {
							attachments.push({
								url: content.image,
								contentType: `image/${filetype}`,
								name: filename.substring(
									filename.indexOf('-') + 1,
									filename.length,
								),
							})
						}
					} else if (content.type === 'file') {
						const filename = (content.data as string).split('/').pop()
						if (!filename) continue
						attachments.push({
							url: content.data,
							contentType: content.mimeType,
							name: filename.substring(
								filename.indexOf('-') + 1,
								filename.length,
							),
						})
					}
				}
			}

			if (message.experimental_attachments !== undefined) {
				attachments = [
					...attachments,
					...message.experimental_attachments,
				]
			}

			chatMessages.push({
				id: message.id,
				role: message.role as Message['role'],
				content: textContent,
				responseId: message.responseId,
				annotations: [
					{ type: 'model', model: message.model },
					...(message.provider === 'google'
						? [
								{
									type: 'google-grounding',
									data: message.providerMetadata?.google,
								},
							]
						: []),
					...(Object.hasOwn(message.providerMetadata, 'kon_chat')
						? [
								{
									type: 'kon_chat',
									...message.providerMetadata.kon_chat,
								},
							]
						: []),
				],
				parts: message.parts ?? parts,
				experimental_attachments: attachments,
				createdAt: new Date(message.createdAt),
			})

			return chatMessages
		},
		[],
	)
}

export function getMostRecentUserMessageIndex(
	messages: Array<UIMessage>,
) {
	const userMessagesIndex = messages.findLastIndex(
		(message) => message.role === 'user',
	)
	return userMessagesIndex
}

export function mergeMessages(
	messages: (Message & { responseId: string })[],
) {
	return messages.reduce(
		(acc, curr, index, array) => {
			if (
				index === 0 ||
				curr.responseId !== acc[acc.length - 1].responseId
			) {
				return [...acc, curr]
			}
			const last = acc[acc.length - 1]
			return [
				...acc.slice(0, -1),
				{
					...last,
					parts: [...(last.parts ?? []), ...(curr.parts ?? [])],
					annotations: [...(curr.annotations ?? [])],
				},
			]
		},
		[] as (Message & { responseId: string })[],
	)
}
