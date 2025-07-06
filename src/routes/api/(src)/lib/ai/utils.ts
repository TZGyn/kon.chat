import {
	type CoreAssistantMessage,
	type CoreToolMessage,
	type CoreUserMessage,
	generateText,
} from 'ai'
import { openai } from './model'

export async function generateTitleFromUserMessage({
	message,
}: {
	message: CoreUserMessage
}) {
	const { text: title } = await generateText({
		model: openai('gpt-4o-mini'),
		system: `\n
    - you will generate a short title based on the first message a user begins a conversation with
    - ensure it is not more than 80 characters long
    - the title should be a summary of the user's message
    - do not use quotes or colons`,
		prompt: JSON.stringify(message),
	})

	return title
}

export function sanitizeResponseMessages({
	messages,
	reasoning,
}: {
	messages: Array<CoreToolMessage | CoreAssistantMessage>
	reasoning: string | undefined
}) {
	const toolResultIds: Array<string> = []

	for (const message of messages) {
		if (message.role === 'tool') {
			for (const content of message.content) {
				if (content.type === 'tool-result') {
					toolResultIds.push(content.toolCallId)
				}
			}
		}
	}

	const messagesBySanitizedContent = messages.map((message) => {
		if (message.role !== 'assistant') return message

		if (typeof message.content === 'string') return message

		const sanitizedContent = message.content.filter((content) =>
			content.type === 'tool-call'
				? toolResultIds.includes(content.toolCallId)
				: content.type === 'text'
					? true
					: true,
		)

		// if (reasoning) {
		// 	// @ts-expect-error: reasoning message parts in sdk is wip
		// 	sanitizedContent.push({ type: 'reasoning', reasoning })
		// }

		return {
			...message,
			content: sanitizedContent,
		}
	})

	return messagesBySanitizedContent.filter(
		(message) => message.content.length > 0,
	)
}
