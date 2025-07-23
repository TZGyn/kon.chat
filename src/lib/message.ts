import type { UIMessage, Message } from '@ai-sdk/ui-utils'

export type ChatUIMessage = UIMessage & {
	status: 'submitted' | 'streaming' | 'ready' | 'error'
	streamId?: string
	chatId?: string
}

export type ChatMessage = Message & {
	status: 'submitted' | 'streaming' | 'ready' | 'error'
}

export function fillMessageParts(messages: ChatMessage[]) {
	return messages.map((message) => ({
		...message,
		parts: getMessageParts(message),
	})) as ChatUIMessage[]
}
function getMessageParts(message: ChatMessage) {
	var _a
	return (_a = message.parts) != null
		? _a
		: [
				...(message.toolInvocations
					? message.toolInvocations.map((toolInvocation) => ({
							type: 'tool-invocation',
							toolInvocation,
						}))
					: []),
				...(message.reasoning
					? [
							{
								type: 'reasoning',
								reasoning: message.reasoning,
								details: [{ type: 'text', text: message.reasoning }],
							},
						]
					: []),
				...(message.content
					? [{ type: 'text', text: message.content }]
					: []),
			]
}
