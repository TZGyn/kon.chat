import {
	getChatState,
	type ChatState,
	type ChatStateInput,
} from './message.svelte'
import type { ChatOptions } from '@ai-sdk/svelte'

let messages = $derived<Record<string, ChatState>>({})

export const useMessages = () => {
	const getMessage = ({
		chat_id,
		options,
	}: {
		chat_id: string
		options: ChatOptions
	}) => {
		if (!(chat_id in messages)) {
			messages[chat_id] = getChatState({
				options: options,
				chatId: chat_id,
			})
		}

		return messages[chat_id]
	}

	return {
		get messages() {
			return messages
		},
		getMessage,
	}
}
