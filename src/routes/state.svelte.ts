import { customFetch } from '$lib/fetch'

let chats = $state<
	{
		id: string
		title: string
		visibility: 'private' | 'public'
		createdAt: number
		updatedAt: number
	}[]
>([])

export function useChats() {
	async function getChats() {
		chats = JSON.parse(localStorage.getItem('chats') || '[]')
		chats = (
			await customFetch<{
				chats: {
					id: string
					title: string
					visibility: 'private' | 'public'
					createdAt: number
					updatedAt: number
				}[]
			}>('/chat')
		).chats
		localStorage.setItem('chats', JSON.stringify(chats || []))
	}

	async function syncChats() {
		const data = await customFetch<{
			chats: {
				id: string
				title: string
				createdAt: number
				updatedAt: number
				isOwner: boolean
				messages: {
					id: string
					createdAt: number
					chatId: string
					responseId: string
					role: string
					content: unknown
					model: string | null
					providerMetadata: any
					provider: string | null
				}[]
			}[]
		}>('/chat/sync')
		for (const chat of data.chats) {
			localStorage.setItem(`chat:${chat.id}`, JSON.stringify(chat))
		}
	}

	async function deleteChats(id: string) {
		const prev = chats

		try {
			chats = chats.filter((chat) => chat.id !== id)
			const success = (
				await customFetch<{ success: boolean }>(`/chat/${id}`, {
					method: 'DELETE',
				})
			).success
			if (!success) {
				localStorage.setItem('chats', JSON.stringify(prev || []))
			}
		} catch (error) {
			chats = prev
		}
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
	}
}

let user = $state<{
	email: string
	name: string
	plan: 'pro' | 'basic' | 'free' | 'owner' | 'trial'
	avatar: string
	credits: number
	purchased_credits: number
	name_for_llm: string
	additional_system_prompt: string
} | null>(null)

export const useUser = () => {
	const getUser = async () => {
		user = JSON.parse(localStorage.getItem('user') || 'null')
		user = (
			await customFetch<{
				user: {
					email: string
					name: string
					plan: 'free' | 'basic' | 'pro' | 'trial'
					avatar: string
					credits: number
					purchased_credits: number
					name_for_llm: string
					additional_system_prompt: string
				} | null
			}>('/auth/me')
		).user
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
