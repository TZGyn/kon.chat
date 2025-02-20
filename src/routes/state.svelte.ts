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
		localStorage.setItem('chats', JSON.stringify(chats))
	}

	async function deleteChats(id: string) {
		const success = (
			await customFetch<{ success: boolean }>(`/chat/${id}`, {
				method: 'DELETE',
			})
		).success

		getChats()
	}

	return {
		get chats() {
			return chats
		},
		getChats,
	}
}

let user = $state<{
	email: string
	name: string
	plan: 'pro' | 'basic' | 'free' | 'owner'
	standardChatLimit: number
	premiumChatLimit: number
	standardChatCredit: number
	premiumChatCredit: number
	searchLimit: number
	searchCredit: number
} | null>(null)

export const useUser = () => {
	const getUser = async () => {
		user = (
			await customFetch<{
				user: {
					email: string
					name: string
					plan: 'free' | 'basic' | 'pro'
					standardChatLimit: number
					premiumChatLimit: number
					standardChatCredit: number
					premiumChatCredit: number
					searchLimit: number
					searchCredit: number
				} | null
			}>('/auth/me')
		).user
	}

	return {
		get user() {
			return user
		},
		getUser,
	}
}
