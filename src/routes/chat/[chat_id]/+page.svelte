<script lang="ts">
	import { Chat } from '@ai-sdk/svelte'
	import { fillMessageParts } from '@ai-sdk/ui-utils'
	import { customFetch, customFetchRaw } from '$lib/fetch'
	import { page } from '$app/state'
	import { useLocalStorage } from '$lib/hooks/use-local-storage.svelte'

	import { cn } from '$lib/utils'
	import { toast } from 'svelte-sonner'
	import { PUBLIC_API_URL } from '$env/static/public'

	import { useChats, useUser } from '../../state.svelte.js'
	import 'katex/dist/katex.css'
	import * as Avatar from '$lib/components/ui/avatar/index.js'
	import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte'
	import { replaceState } from '$app/navigation'
	import MessageBlock from '$lib/components/message-block.svelte'
	import { UseAutoScroll } from '$lib/hooks/use-auto-scroll.svelte.js'
	import {
		BotOffIcon,
		CopyIcon,
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

	let chat_id = $derived(page.params.chat_id)
	let isNew = $derived(page.url.searchParams.get('type') === 'new')
	let upload_url = $derived(`/chat/${chat_id}/upload`)

	type Message = {
		id: string
		createdAt: number
		chatId: string
		responseId: string
		role: string
		content: unknown
		model: string | null
		providerMetadata: any
		provider: string | null
	}

	type Chat = {
		id: string
		createdAt: number
		isOwner: boolean
		title: string
		messages: Message[]
	} | null

	const getChat = async (id: string) => {
		const data = (await customFetch<{ chat: Chat }>(`/chat/${id}`))
			.chat

		localStorage.setItem(`chat:${id}`, JSON.stringify(data))
		if (chat_id !== id) return
		chat.value = data ?? null
		const serverMessages = convertToUIMessages(
			chat.value?.messages ?? [],
		)
		const mergedMessages = mergeMessages(serverMessages)
		if (useChat.status === 'ready' || useChat.status === 'error') {
			useChat.messages = mergedMessages
		} else {
			const latestUserMessageIndex = getMostRecentUserMessageIndex(
				useChat.messages,
			)
			useChat.messages = [
				...mergedMessages,
				...useChat.messages.slice(latestUserMessageIndex),
			]
		}
	}

	let chat = $derived(
		useLocalStorage<Chat | Message[]>(`chat:${chat_id}`, null),
	)

	onMount(() => {})

	$effect(() => {
		const chat = localStorage.getItem(`chat:${chat_id}`)

		const chatJSON = JSON.parse(chat || 'null') as Chat | Message[]

		if (chatJSON) {
			if ('isOwner' in chatJSON) {
				useChat.messages = convertToUIMessages(
					chatJSON?.messages || [],
				)
			} else {
				useChat.messages = convertToUIMessages(chatJSON || [])
			}
		}
		getChat(chat_id)
	})

	const autoScroll = new UseAutoScroll()

	const chats = useChats()

	let useChat = new Chat({
		initialMessages: [],
		get api() {
			return PUBLIC_API_URL + `/chat/${chat_id}`
		},
		get id() {
			return chat_id
		},
		onFinish: () => {
			if (page.url.searchParams) {
				page.url.searchParams.delete('type')
				replaceState(page.url, page.state)
			}
			setTimeout(() => {
				chats.getChats()
				useUser().getUser()
			}, 3000)
			if (chat.value !== null) {
				chat.value = {
					...chat.value,
					messages: useChat.messages as any,
				}
			} else {
				chat.value = {
					id: 'new chat',
					title: 'new chat',
					isOwner: true,
					createdAt: Date.now(),
					messages: useChat.messages as any,
				}
			}
		},
		onError: (error) => {
			toast.error(error.message)
		},
		credentials: 'include',
	})

	let shareChatDialogOpen = $state(false)

	const shareChat = async (chat_id: string) => {
		const response = await customFetchRaw(`/chat/${chat_id}/share`, {
			method: 'POST',
		})

		if (response.status === 200) {
		}
	}
</script>

<div class="relative flex flex-1 overflow-hidden">
	{#if chat.value || isNew}
		<ScrollArea
			bind:vp={autoScroll.ref}
			class="@container flex flex-1 flex-col items-center p-4">
			<div class="flex w-full flex-col items-center pb-40 pt-20">
				<div class="flex w-full max-w-[600px] flex-col gap-4">
					{#each useChat.messages as message, index (index)}
						<MessageBlock
							data={useChat.data}
							{message}
							role={message.role}
							status={useChat.status}
							isLast={index === useChat.messages.length - 1} />
					{/each}
					{#if useChat.status === 'submitted'}
						<div
							class={cn(
								'flex min-h-[calc(100vh-25rem)] gap-2 place-self-start',
							)}>
							<div class="group flex flex-col gap-2">
								<div class="flex items-center gap-4">
									<div
										class="ring-border flex size-8 shrink-0 items-center justify-center rounded-full bg-black ring-1">
										<div class="translate-y-px">
											<Avatar.Root class="size-4 overflow-visible">
												<Avatar.Image
													src={'/logo.png'}
													alt="favicon"
													class="size-4" />
												<Avatar.Fallback class="size-4 bg-opacity-0">
													<img src="/logo.png" alt="favicon" />
												</Avatar.Fallback>
											</Avatar.Root>
										</div>
									</div>
									<div class="flex animate-pulse items-center gap-2">
										<Loader2Icon class="size-4 animate-spin" />
										Submitting Prompt
									</div>
								</div>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</ScrollArea>
		{#if !isNew}
			<div
				class="bg-secondary absolute right-0 top-0 flex items-center gap-2 rounded-bl-full pl-4 pr-2">
				{#if !('isOwner' in chat.value!) || chat.value.isOwner}
					<Button
						size="icon"
						variant="ghost"
						class="hover:bg-transparent"
						onclick={() => (shareChatDialogOpen = true)}>
						<Share2Icon />
					</Button>
				{:else}
					<Button
						size="icon"
						variant="ghost"
						class="hover:bg-transparent"
						onclick={() => (shareChatDialogOpen = true)}>
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
					Share this chat?
				</Dialog.Title>
				<Dialog.Description class="text-center">
					You are about to make this chat publically viewable
				</Dialog.Description>
			</div>
			<div class="flex justify-center gap-6">
				<Button
					variant="outline"
					class="w-full"
					onclick={() => {
						shareChatDialogOpen = false
					}}
					disabled={false}>
					Cancel
				</Button>
				<Button
					variant="default"
					onclick={() => {}}
					class="flex w-full gap-2"
					disabled={false}>
					Share
				</Button>
			</div>
		</Dialog.Header>
	</Dialog.Content>
</Dialog.Root>

{#if (chat.value && (!('isOwner' in chat.value) || chat.value.isOwner)) || isNew}
	<MultiModalInput
		bind:input={useChat.input}
		{upload_url}
		selectedModelLocator={`model:chat:${chat_id}`}
		handleSubmit={useChat.handleSubmit}
		bind:messages={useChat.messages}
		bind:data={useChat.data}
		status={useChat.status}
		imageUpload={true}
		fileUpload={true}
		enableSearch={true}
		{autoScroll}
		{stop} />
{/if}
