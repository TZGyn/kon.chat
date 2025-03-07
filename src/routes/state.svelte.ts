import { customFetch } from '$lib/fetch'
import { useLocalStorage } from '$lib/hooks/use-local-storage.svelte'

export function useChats() {
	let chats = useLocalStorage<{ id: string; title: string }[]>(
		'chats',
		[],
	)
	async function getChats() {
		chats.value = (
			await customFetch<{ chats: { id: string; title: string }[] }>(
				'/chat',
			)
		).chats
	}

	async function deleteChats(id: string) {
		const prev = chats.value

		try {
			chats.value = chats.value.filter((chat) => chat.id !== id)
			const success = (
				await customFetch<{ success: boolean }>(`/chat/${id}`, {
					method: 'DELETE',
				})
			).success
			if (!success) {
				chats.value = prev
			}
		} catch (error) {
			chats.value = prev
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
		user = (
			await customFetch<{
				user: {
					email: string
					name: string
					plan: 'free' | 'basic' | 'pro' | 'trial'
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
	}

	return {
		get user() {
			return user
		},
		getUser,
	}
}
