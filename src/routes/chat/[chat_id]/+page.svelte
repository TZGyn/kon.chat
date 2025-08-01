<script lang="ts">
	import type {
		Chat as ChatType,
		Message as MessageType,
	} from '$api/db/type.js'
	import { page } from '$app/state'
	import { useLocalStorage } from '$lib/hooks/use-local-storage.svelte'

	import { toast } from 'svelte-sonner'

	import { useChats } from '$lib/states/chats.svelte.js'
	import { goto, replaceState } from '$app/navigation'
	import MessageBlock from '$lib/components/message-block.svelte'
	import { UseAutoScroll } from '$lib/hooks/use-auto-scroll.svelte.js'
	import {
		BotOffIcon,
		CopyIcon,
		EyeClosedIcon,
		EyeIcon,
		Loader2Icon,
		MessageCircleIcon,
		Share2Icon,
	} from 'lucide-svelte'
	import MultiModalInput from '$lib/components/multi-modal-input.svelte'
	import { onMount } from 'svelte'
	import {
		convertToUIMessages,
		getMostRecentUserMessageIndex,
		mergeMessages,
	} from '$lib/utils/chat.js'
	import { Button } from '$lib/components/ui/button/index.js'
	import * as Dialog from '$lib/components/ui/dialog/index.js'
	import * as Tooltip from '$lib/components/ui/tooltip/index.js'
	import { Snippet } from '$lib/components/ui/snippet'
	import { nanoid } from '$lib/nanoid.js'
	import { type ChatRequestOptions } from '@ai-sdk/ui-utils'
	import { PUBLIC_API_URL, PUBLIC_APP_URL } from '$env/static/public'
	import { makeClient } from '$api/api-client.js'
	import { processStream } from '$lib/stream.js'
	import { parseSSE } from '$lib/sse.js'
	import { browser } from '$app/environment'
	import { getChatState } from './message.svelte.js'
	import type { ChatUIMessage } from '$lib/message.js'

	let chat_id = $derived(page.params.chat_id)
	let isNew = $derived(page.url.searchParams.get('type') === 'new')
	let upload_url = $derived(`/chat/${chat_id}/upload`)

	const client = makeClient(fetch)

	const clientId = nanoid()

	type Message = Omit<
		MessageType,
		'promptTokens' | 'completionTokens' | 'totalTokens'
	>

	type Chat =
		| (Omit<ChatType, 'userId' | 'updatedAt'> & {
				isOwner: boolean
				messages: Message[]
		  })
		| null

	const getChat = async (id: string) => {
		if (page.url.searchParams.get('type') === 'new_branch') return

		const response = await client.chat[':chat_id'].$get({
			param: { chat_id: id },
		})
		const data = (await response.json()).chat

		localStorage.setItem(`chat:${id}`, JSON.stringify(data))
		if (chat_id !== id) return
		chat.value = data ?? null
		const serverMessages = convertToUIMessages(
			chat.value?.messages ?? [],
		)
		const mergedMessages = mergeMessages(serverMessages)
		if (
			customUseChat.status === 'ready' ||
			customUseChat.status === 'error'
		) {
			customUseChat.messages = mergedMessages.map((message) => ({
				...message,
				status: 'ready',
			}))
		} else {
			const latestUserMessageIndex = getMostRecentUserMessageIndex(
				customUseChat.messages,
			)

			customUseChat.messages = [
				...(mergedMessages.map((message) => ({
					...message,
					status: 'ready',
				})) as ChatUIMessage[]),
				...customUseChat.messages.slice(latestUserMessageIndex),
			]
		}
	}

	let chat = $derived(useLocalStorage<Chat>(`chat:${chat_id}`, null))

	onMount(async () => {
		const response = await makeClient(fetch).chat[
			':chat_id'
		].active_streams.$get({
			param: {
				chat_id: chat_id,
			},
		})

		if (response.status === 200) {
			const activeStreams = await response.json()

			activeStreams.activeStreams.map(async (stream) => {
				customUseChat.messages.push(stream.message as ChatUIMessage)
				const messages = $state.snapshot(customUseChat.messages)
				await customUseChat.getMessage({
					index: messages.length - 1,
					type: 'resume',
					chatRequest: {
						body: {
							id: stream.id,
						},
					},
					streamId: stream.id,
				})
			})
		}
	})

	$effect(() => {
		const chat = localStorage.getItem(`chat:${chat_id}`)
		if (chat) {
			const chatJSON = JSON.parse(chat) as Chat

			if (chatJSON) {
				customUseChat.messages = mergeMessages(
					convertToUIMessages(chatJSON?.messages || []),
				).map((message) => ({
					...message,
					status: 'streaming',
				})) as ChatUIMessage[]
			}
		}
		getChat(chat_id)
	})

	const autoScroll = new UseAutoScroll()

	const chats = useChats()

	$effect(() => {
		customUseChat.chatId = chat_id
	})

	let customUseChat = getChatState({
		get chatId() {
			return chat_id
		},
		clientId: clientId,
		options: {
			initialMessages: [],
			get api() {
				return `${PUBLIC_API_URL}/chat/${chat_id}`
			},
			get id() {
				return chat_id
			},
			onFinish: (response) => {
				if (page.url.searchParams.has('type')) {
					page.url.searchParams.delete('type')
					replaceState(page.url, page.state)
					isNew = false
				}
				setTimeout(() => {
					chats.getChats()
				}, 3000)

				const message: Message = {
					chatId: customUseChat.id,
					...response,
					content: response.parts,
					model:
						// @ts-ignore
						response.annotations?.find(
							(annotation) =>
								// @ts-ignore
								annotation['type'] === 'model' &&
								// @ts-ignore
								annotation['model'] !== null,
							// @ts-ignore
						).model || '',
					provider: '',
					providerMetadata: {},
					responseId: '',
					createdAt: Date.now(),
				}
				if (chat.value !== null) {
					chat.value = {
						...chat.value,
						messages: [...chat.value.messages, message],
					}
				}

				customUseChat.status = 'ready'
			},
			onError: (error) => {
				customUseChat.status = 'ready'
				customUseChat.messages[
					customUseChat.messages.length - 1
				].annotations?.push({
					type: 'kon_chat',
					status: 'error',
					error: {
						type: error.name,
						message: error.message,
					},
				})
			},
			credentials: 'include',
		},
	})

	let shareChatDialogOpen = $state(false)
	let sharingChat = $state(false)

	const shareChat = async (chat_id: string) => {
		sharingChat = true
		const data = chat.value
		if (!data) return

		const response = await client.chat[
			':chat_id'
		].change_visibility.$put({
			param: { chat_id: chat_id },
			json: {
				visibility:
					data.visibility === 'private' ? 'public' : 'private',
			},
		})

		if (response.status === 200) {
			chat.value = {
				...data,
				visibility:
					data.visibility === 'private' ? 'public' : 'private',
			}
		} else {
			toast.error('Something went wrong when sharing')
		}
		sharingChat = false
	}

	let copyChatDialogOpen = $state(false)
	let copyingChat = $state(false)

	const copyChat = async (chat_id: string) => {
		copyingChat = true

		const response = await client.chat[':chat_id'].copy.$post({
			param: { chat_id: chat_id },
		})

		if (response.status !== 200) {
			toast.error('Cannot copy this chat to your account')
		}

		const body = (await response.json()) as { id: string }
		copyingChat = true

		await goto(`/chat/${body.id}`)
		copyChatDialogOpen = false
		chats.getChats()
		toast.success('Chat Copied')
	}

	const branch = async (at_message_id: string, chat_id: string) => {
		const chat = localStorage.getItem(`chat:${chat_id}`)

		const chatJSON = JSON.parse(chat || 'null') as Chat
		if (!chatJSON) {
			toast.error('Invalid Chat')
			return
		}

		const newChatId = nanoid()

		const newBranch = {
			...chatJSON,
			title: chatJSON.title + ' (branch)',
			createdAt: Date.now(),
			id: newChatId,
			visibility: 'private',
			messages: chatJSON.messages.slice(
				0,
				chatJSON.messages.findIndex(
					(message) => message.id === at_message_id,
				) + 1,
			),
		} as Chat

		localStorage.setItem(
			`chat:${newChatId}`,
			JSON.stringify(newBranch),
		)

		chats.chats = [
			{
				id: newChatId,
				title: chatJSON.title + ' (branch)',
				visibility: 'private',
				status: 'ready',
				createdAt: Date.now(),
				updatedAt: Date.now(),
			},
			...chats.chats,
		]

		goto(`/chat/${newChatId}?type=new_branch`)

		await client.chat.branch.$post({
			json: {
				chat_id: chat_id,
				new_chat_id: newChatId,
				at_message_id: at_message_id,
			},
		})
	}
</script>

<div class="relative flex flex-1 overflow-hidden">
	{#if chat.value || isNew}
		<div
			bind:this={autoScroll.ref}
			class="@container flex flex-1 flex-col items-center overflow-y-scroll p-4">
			<div class="flex w-full flex-col items-center pt-20 pb-40">
				<div
					class="@container/chat flex w-full max-w-[600px] flex-col gap-4">
					{#each customUseChat.messages as message, index (index)}
						<MessageBlock
							data={customUseChat.data}
							{message}
							role={message.role}
							isLast={index === customUseChat.messages.length - 1}
							branch={() => branch(message.id, chat_id)} />
					{/each}
				</div>
			</div>
		</div>
		{#if !isNew}
			<div
				class="bg-secondary absolute top-0 right-0 flex items-center gap-2 rounded-bl-full pr-2 pl-4">
				{#if chat.value && chat.value.isOwner}
					<Button
						size="icon"
						variant="ghost"
						class="hover:bg-transparent"
						onclick={() => (shareChatDialogOpen = true)}>
						<Share2Icon />
					</Button>
					{#if chat.value.visibility === 'public'}
						<Tooltip.Provider>
							<Tooltip.Root>
								<Tooltip.Trigger>
									<div class="p-2">
										<EyeIcon class="text-muted-foreground h-4" />
									</div>
								</Tooltip.Trigger>
								<Tooltip.Content>
									<p>Public</p>
								</Tooltip.Content>
							</Tooltip.Root>
						</Tooltip.Provider>
					{:else}
						<Tooltip.Provider>
							<Tooltip.Root>
								<Tooltip.Trigger>
									<div class="p-2">
										<EyeClosedIcon
											class="text-muted-foreground h-4" />
									</div>
								</Tooltip.Trigger>
								<Tooltip.Content>
									<p>Private</p>
								</Tooltip.Content>
							</Tooltip.Root>
						</Tooltip.Provider>
					{/if}
				{:else}
					<Button
						size="icon"
						variant="ghost"
						class="hover:bg-transparent"
						onclick={() => (copyChatDialogOpen = true)}>
						<CopyIcon />
					</Button>
				{/if}
			</div>
		{/if}
	{:else}
		<div
			class="flex flex-1 flex-col items-center justify-center gap-4">
			<BotOffIcon class="size-32" />
			<span class="text-xl font-bold">Chat Not Found</span>
		</div>
	{/if}
</div>

<Dialog.Root bind:open={shareChatDialogOpen}>
	<Dialog.Content class="@container">
		<Dialog.Header class="space-y-12">
			<div
				class="flex w-full flex-col items-center justify-center gap-6 pt-12">
				<div class="bg-primary/30 w-fit rounded-full p-4">
					<MessageCircleIcon class="text-primary" size={64} />
				</div>
			</div>
			<div class="space-y-2">
				<Dialog.Title class="text-center">
					{chat.value?.visibility === 'private'
						? 'Share this chat?'
						: 'Private this chat?'}
				</Dialog.Title>
				<Dialog.Description class="text-center">
					{chat.value?.visibility === 'private'
						? 'You are about to make this chat publically viewable'
						: 'You are about to make this chat private'}
				</Dialog.Description>
			</div>

			{#if chat.value?.visibility === 'public'}
				<div class="flex w-full justify-center">
					<Snippet
						text={PUBLIC_APP_URL + `/chat/${chat_id}`}
						class="w-full max-w-[100cqw]"
						singleLineClass="overflow-hidden text-ellipsis" />
				</div>
			{/if}
			<div class="flex w-full max-w-[cqw] justify-center gap-6">
				<Button
					variant="outline"
					class="flex-1 gap-2"
					onclick={() => {
						shareChatDialogOpen = false
					}}
					disabled={false}>
					Cancel
				</Button>
				<Button
					variant="default"
					onclick={() => shareChat(chat_id)}
					class="flex-1 gap-2"
					disabled={sharingChat}>
					{#if sharingChat}
						<Loader2Icon class="animate-spin" />
					{/if}
					{chat.value?.visibility === 'private' ? 'Share' : 'Unshare'}
				</Button>
			</div>
		</Dialog.Header>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={copyChatDialogOpen}>
	<Dialog.Content>
		<Dialog.Header class="space-y-12">
			<div
				class="flex w-full flex-col items-center justify-center gap-6 pt-12">
				<div class="bg-primary/30 w-fit rounded-full p-4">
					<MessageCircleIcon class="text-primary" size={64} />
				</div>
			</div>
			<div class="space-y-2">
				<Dialog.Title class="text-center">
					{'Copy this chat?'}
				</Dialog.Title>
				<Dialog.Description class="text-center">
					{'You are copying this chat to your account'}
				</Dialog.Description>
			</div>
			<div class="flex justify-center gap-6">
				<Button
					variant="outline"
					class="flex-1"
					onclick={() => {
						copyChatDialogOpen = false
					}}
					disabled={false}>
					Cancel
				</Button>
				<Button
					variant="default"
					onclick={() => copyChat(chat_id)}
					class="flex flex-1 gap-2"
					disabled={copyingChat}>
					{#if copyingChat}
						<Loader2Icon class="animate-spin" />
					{/if}
					Copy
				</Button>
			</div>
		</Dialog.Header>
	</Dialog.Content>
</Dialog.Root>

{#if (chat.value && chat.value.isOwner) || isNew}
	<MultiModalInput
		bind:input={customUseChat.input}
		{upload_url}
		selectedModelLocator={`model:chat:${chat_id}`}
		handleSubmit={async (
			e,
			chatRequestOptions?: ChatRequestOptions,
		) => {
			const message: Message = {
				chatId: customUseChat.id,
				content: [
					{
						type: 'text',
						text: customUseChat.input,
					},
				],
				id: nanoid(),
				model: '',
				provider: '',
				providerMetadata: {},
				responseId: '',
				role: 'user',
				createdAt: Date.now(),
			}
			if (chat.value === null) {
				chat.value = {
					id: 'new chat',
					title: 'new chat',
					visibility: 'private',
					isOwner: true,
					createdAt: Date.now(),
					messages: [message],
				}
			} else {
				chat.value = {
					...chat.value,
					messages: [...chat.value.messages, message],
				}
			}

			chats.updateChatStatus({ id: chat_id, status: 'streaming' })
			await customUseChat.handleSubmit(e, {
				...chatRequestOptions,
				body: { ...chatRequestOptions?.body, clientId },
			})
			chats.updateChatStatus({ id: chat_id, status: 'ready' })
		}}
		bind:messages={customUseChat.messages}
		bind:data={customUseChat.data}
		imageUpload={true}
		fileUpload={true}
		enableSearch={true}
		{autoScroll} />
{/if}
