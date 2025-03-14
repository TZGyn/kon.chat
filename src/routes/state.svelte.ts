import { customFetch } from '$lib/fetch'

let chats = $state<{ id: string; title: string }[]>([])

export function useChats() {
	async function getChats() {
		chats = JSON.parse(localStorage.getItem('chats') || '[]')
		chats = (
			await customFetch<{ chats: { id: string; title: string }[] }>(
				'/chat',
			)
		).chats
		localStorage.setItem('chats', JSON.stringify(chats || []))
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
		getChats,
		deleteChats,
	}
}

let user = $state<{
	email: string
	name: string
	plan: 'pro' | 'basic' | 'free' | 'owner' | 'trial'
	avatar: string
	freeChatLimit: number
	standardChatLimit: number
	premiumChatLimit: number
	standardChatCredit: number
	premiumChatCredit: number
	searchLimit: number
	searchCredit: number
} | null>(null)

export const useUser = () => {
	const getUser = async () => {
		user = JSON.parse(localStorage.getItem('user') || '{}')
		user = (
			await customFetch<{
				user: {
					email: string
					name: string
					plan: 'free' | 'basic' | 'pro' | 'trial'
					avatar: string
					freeChatLimit: number
					standardChatLimit: number
					premiumChatLimit: number
					standardChatCredit: number
					premiumChatCredit: number
					searchLimit: number
					searchCredit: number
				} | null
			}>('/auth/me')
		).user
		localStorage.setItem('user', JSON.stringify(user || {}))
	}

	return {
		get user() {
			return user
		},
		getUser,
	}
}
