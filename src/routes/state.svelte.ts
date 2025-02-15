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

let user = $state<{
	email: string
	name: string
	plan: 'pro' | 'basic' | 'free' | 'owner'
} | null>(null)

export const useUser = () => {
	const getUser = async () => {
		user = (
			await customFetch<{
				user: {
					email: string
					name: string
					plan: 'free' | 'basic' | 'pro'
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
