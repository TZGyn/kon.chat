import { customFetch } from '$lib/fetch'

let chats = $state<{ id: string; title: string }[]>([])

export function useChats() {
	async function getChats() {
		chats = (
			await customFetch<{ chats: { id: string; title: string }[] }>(
				'/chat',
			)
		).chats
	}

	return {
		get chats() {
			return chats
		},
		getChats,
	}
}
