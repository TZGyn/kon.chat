import {
	getChatState,
	type ChatState,
	type ChatStateInput,
} from './message.svelte'

let messages = $state<Record<string, ChatState>>({})
export const useMessages = (input: ChatStateInput) => {
	const getMessage = (chat_id: string) => {
		if (chat_id in messages) {
			return messages[chat_id]
		} else {
			messages[chat_id] = getChatState(input)
		}
	}

	return {
		getMessage,
	}
}
