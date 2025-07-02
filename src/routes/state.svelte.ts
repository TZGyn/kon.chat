import { makeClient } from '$api/api-client'

let chats = $state<
	{
		id: string
		title: string
		visibility: 'private' | 'public'
		status: 'streaming' | 'ready'
		createdAt: number
		updatedAt: number
	}[]
>([])

export function useChats() {
	async function getChats() {
		chats = JSON.parse(localStorage.getItem('chats') || '[]')
		const response = await makeClient(fetch).chat.$get()
		const data = await response.json()
		chats = data.chats.map((chat) => ({ ...chat, status: 'ready' }))
		localStorage.setItem('chats', JSON.stringify(chats || []))
	}

	async function syncChats() {
		const response = await makeClient(fetch).chat.sync.$get()
		const data = await response.json()
		for (const chat of data.chats) {
			localStorage.setItem(`chat:${chat.id}`, JSON.stringify(chat))
		}
	}

	async function deleteChats(id: string) {
		const prev = chats

		try {
			chats = chats.filter((chat) => chat.id !== id)

			const response = await makeClient(fetch).chat[
				':chat_id'
			].$delete({ param: { chat_id: id } })

			const success = (await response.json()).success

			if (!success) {
				localStorage.setItem('chats', JSON.stringify(prev || []))
			}
		} catch (error) {
			chats = prev
		}
	}

	function updateChatStatus({
		id,
		status,
	}: {
		id: string
		status: 'ready' | 'streaming'
	}) {
		chats = chats.map((chat) => {
			if (chat.id === id) {
				chat.status = status
			}
			return chat
		})
	}

	return {
		get chats() {
			return chats
		},
		set chats(new_chats) {
			chats = new_chats
		},
		getChats,
		deleteChats,
		syncChats,
		updateChatStatus,
	}
}

let user = $state<{
	email: string
	name: string
	avatar: string | null
	name_for_llm: string
	additional_system_prompt: string
} | null>(null)

export const useUser = () => {
	const getUser = async () => {
		user = JSON.parse(localStorage.getItem('user') || 'null')
		const response = await makeClient(fetch).auth.me.$get()
		const data = await response.json()
		user = data.user
		localStorage.setItem('user', JSON.stringify(user || null))
	}

	return {
		get user() {
			return user
		},
		set user(new_user) {
			user = new_user
			localStorage.setItem('user', JSON.stringify(user || null))
		},
		getUser,
	}
}
