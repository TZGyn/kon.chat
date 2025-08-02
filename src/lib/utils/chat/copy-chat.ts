import { makeClient } from '$api/api-client'
import { goto } from '$app/navigation'
import { useChats } from '$lib/states/chats.svelte'
import { toast } from 'svelte-sonner'

const client = makeClient(fetch)

const chats = useChats()

export const copyChat = async (chat_id: string) => {
	const response = await client.chat[':chat_id'].copy.$post({
		param: { chat_id: chat_id },
	})

	if (response.status !== 200) {
		toast.error('Cannot copy this chat to your account')
	}

	const body = (await response.json()) as { id: string }

	await goto(`/chat/${body.id}`)
	chats.getChats()
	toast.success('Chat Copied')
}
