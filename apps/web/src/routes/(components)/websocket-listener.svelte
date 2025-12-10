<script lang="ts">
	import { client } from '$lib/fetch'
	import type { ChatUIMessage } from '$lib/message'
	import { useMessages } from '$lib/states/messages.svelte'
	import { onMount } from 'svelte'
	import { nanoid } from 'zod/v4'


	const messages = useMessages()

	onMount(() => {
		const ws = client.ws.$ws()

		ws.addEventListener('message', async (event) => {
			const data = JSON.parse(event.data)
			console.log(data)
			if (data.type === 'new-message') {
				if (data.chatId in messages.messages) {
					if (
						messages.messages[data.chatId].ignoreStreams.includes(
							data.id,
						)
					) {
						return
					}

					messages.messages[data.chatId].messages.push({
						id: nanoid(),
						...data.data,
					} as ChatUIMessage)

					const snapshotMessages = $state.snapshot(
						messages.messages[data.chatId].messages,
					)

					await messages.messages[data.chatId].getMessage({
						index: snapshotMessages.length - 1,
						type: 'resume',
						chatRequest: {
							body: {
								id: data.id,
							},
						},
						streamId: data.id,
					})
				}
			}
		})
	})
</script>
