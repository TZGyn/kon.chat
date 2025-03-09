import type { Message } from 'ai'

export function fillMessageParts(messages: Message[]) {
	return messages.map((message) => ({
		...message,
		parts: getMessageParts(message),
	}))
}
function getMessageParts(message: Message) {
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
