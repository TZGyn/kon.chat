<script lang="ts">
	import { Chat } from '@ai-sdk/svelte'
	import type {
		Chat as ChatType,
		Message as MessageType,
	} from '$api/db/type.js'
	import { page } from '$app/state'
	import { useLocalStorage } from '$lib/hooks/use-local-storage.svelte'

	import { cn } from '$lib/utils'
	import { toast } from 'svelte-sonner'

	import { useChats, useUser } from '../../state.svelte.js'
	import * as Avatar from '$lib/components/ui/avatar/index.js'
	import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte'
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
	import {
		callChatApi,
		type ChatRequestOptions,
		type UIMessage,
	} from '@ai-sdk/ui-utils'
	import { PUBLIC_APP_URL } from '$env/static/public'
	import { makeClient } from '$api/api-client.js'
	import { customFetchRaw } from '$lib/fetch.js'
	import { processStream } from '$lib/stream.js'
	import { parseSSE } from '$lib/sse.js'
	import { browser } from '$app/environment'
	import { type UIMessage as ChatMessage } from '@ai-sdk/svelte'
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

	onMount(() => {})

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

	const user = useUser()

	const autoScroll = new UseAutoScroll()

	const chats = useChats()

	let customUseChat = getChatState({
		initialMessages: [],
		get api() {
			return `/api/chat/${chat_id}`
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
				user.getUser()
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

	const resumeChat = async (chat_id: string) => {
		const response = await client.chat[':chat_id'].sse.$post({
			param: { chat_id },
		})

		if (!response.body) return

		await processStream({
			stream: response.body,
			onValue: async ({ value }) => {
				const event = parseSSE(value)
				console.log(event)
				if (!event) return

				if (
					event.event === 'new-message' &&
					event.data.clientId != clientId
				) {
					customUseChat.messages.push(
						event.data.data as ChatUIMessage,
					)
					const messages = $state.snapshot(customUseChat.messages)

					const abortController = new AbortController()
					// await resumeMessage({ messageId: event.data.id })
					try {
						await callChatApi({
							api: `/api/chat/${chat_id}/resume`,
							body: {
								id: event.data.id,
							},
							headers: {},
							streamProtocol: 'data',
							credentials: 'include',
							abortController: () => abortController,
							onUpdate: ({ message, data, replaceLastMessage }) => {
								customUseChat.messages = messages
								if (replaceLastMessage) {
									customUseChat.messages[
										customUseChat.messages.length - 1
									] = { ...message, status: 'streaming' }
								} else {
									customUseChat.messages.push({
										...message,
										status: 'streaming',
									})
								}

								if (data?.length) {
									// useChat.data = existingData;
									customUseChat.data?.push(...data)
								}
							},
							onResponse: () => {},
							onFinish: () => {
								abortController.abort()
								customUseChat.messages[
									customUseChat.messages.length - 1
								].status = 'ready'
							},
							onToolCall: () => {},
							restoreMessagesOnFailure: () => {},
							fetch: undefined,
							lastMessage: $state.snapshot(
								customUseChat.messages[
									customUseChat.messages.length - 1
								],
							),
							generateId: () => nanoid(),
						})
					} catch (error) {
						if (!(error instanceof Error)) {
							return
						}
						console.log(error)
						abortController.abort()
						customUseChat.messages[
							customUseChat.messages.length - 1
						].status = 'ready'

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
					}
				}
			},
		})
	}

	$effect(() => {
		chat_id
		browser && resumeChat(chat_id)
	})
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
					{!user.user
						? 'You must be logged in to use this feature'
						: 'You are copying this chat to your account'}
				</Dialog.Description>
			</div>
			{#if !user.user}
				<div class="grid gap-4">
					<Button
						href={`/api/auth/login/github?redirect=${PUBLIC_APP_URL + '/' + 'chat/' + chat_id}`}
						variant="outline"
						class="w-full">
						<svg
							viewBox="0 0 256 250"
							width="256"
							height="250"
							fill="#fff"
							xmlns="http://www.w3.org/2000/svg"
							preserveAspectRatio="xMidYMid">
							<path
								d="M128.001 0C57.317 0 0 57.307 0 128.001c0 56.554 36.676 104.535 87.535 121.46 6.397 1.185 8.746-2.777 8.746-6.158 0-3.052-.12-13.135-.174-23.83-35.61 7.742-43.124-15.103-43.124-15.103-5.823-14.795-14.213-18.73-14.213-18.73-11.613-7.944.876-7.78.876-7.78 12.853.902 19.621 13.19 19.621 13.19 11.417 19.568 29.945 13.911 37.249 10.64 1.149-8.272 4.466-13.92 8.127-17.116-28.431-3.236-58.318-14.212-58.318-63.258 0-13.975 5-25.394 13.188-34.358-1.329-3.224-5.71-16.242 1.24-33.874 0 0 10.749-3.44 35.21 13.121 10.21-2.836 21.16-4.258 32.038-4.307 10.878.049 21.837 1.47 32.066 4.307 24.431-16.56 35.165-13.12 35.165-13.12 6.967 17.63 2.584 30.65 1.255 33.873 8.207 8.964 13.173 20.383 13.173 34.358 0 49.163-29.944 59.988-58.447 63.157 4.591 3.972 8.682 11.762 8.682 23.704 0 17.126-.148 30.91-.148 35.126 0 3.407 2.304 7.398 8.792 6.14C219.37 232.5 256 184.537 256 128.002 256 57.307 198.691 0 128.001 0Zm-80.06 182.34c-.282.636-1.283.827-2.194.39-.929-.417-1.45-1.284-1.15-1.922.276-.655 1.279-.838 2.205-.399.93.418 1.46 1.293 1.139 1.931Zm6.296 5.618c-.61.566-1.804.303-2.614-.591-.837-.892-.994-2.086-.375-2.66.63-.566 1.787-.301 2.626.591.838.903 1 2.088.363 2.66Zm4.32 7.188c-.785.545-2.067.034-2.86-1.104-.784-1.138-.784-2.503.017-3.05.795-.547 2.058-.055 2.861 1.075.782 1.157.782 2.522-.019 3.08Zm7.304 8.325c-.701.774-2.196.566-3.29-.49-1.119-1.032-1.43-2.496-.726-3.27.71-.776 2.213-.558 3.315.49 1.11 1.03 1.45 2.505.701 3.27Zm9.442 2.81c-.31 1.003-1.75 1.459-3.199 1.033-1.448-.439-2.395-1.613-2.103-2.626.301-1.01 1.747-1.484 3.207-1.028 1.446.436 2.396 1.602 2.095 2.622Zm10.744 1.193c.036 1.055-1.193 1.93-2.715 1.95-1.53.034-2.769-.82-2.786-1.86 0-1.065 1.202-1.932 2.733-1.958 1.522-.03 2.768.818 2.768 1.868Zm10.555-.405c.182 1.03-.875 2.088-2.387 2.37-1.485.271-2.861-.365-3.05-1.386-.184-1.056.893-2.114 2.376-2.387 1.514-.263 2.868.356 3.061 1.403Z" />
						</svg>
						Login with Github
					</Button>
					<Button
						href={`/api/auth/login/google?redirect=${PUBLIC_APP_URL + '/' + 'chat/' + chat_id}`}
						variant="outline"
						class="w-full">
						<svg
							width="256"
							height="262"
							viewBox="0 0 256 262"
							xmlns="http://www.w3.org/2000/svg"
							preserveAspectRatio="xMidYMid">
							<path
								d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
								fill="#4285F4" />
							<path
								d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
								fill="#34A853" />
							<path
								d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"
								fill="#FBBC05" />
							<path
								d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
								fill="#EB4335" />
						</svg>
						Login with Google
					</Button>
				</div>
			{:else}
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
			{/if}
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
		status={customUseChat.status}
		imageUpload={true}
		fileUpload={true}
		enableSearch={true}
		{autoScroll}
		stop={() => {
			customUseChat.messages[
				customUseChat.messages.length - 1
			].annotations?.push({
				type: 'kon_chat',
				status: 'error',
				error: {
					type: 'stopped_by_user',
					message: 'Stopped By User',
				},
			})
			if (page.url.searchParams) {
				page.url.searchParams.delete('type')
				replaceState(page.url, page.state)
				isNew = false
			}
			setTimeout(() => {
				chats.getChats()
				user.getUser()
			}, 3000)
			if (chat.value !== null) {
				chat.value = {
					...chat.value,
					messages: customUseChat.messages as any,
				}
			} else {
				chat.value = {
					id: 'new chat',
					title: 'new chat',
					visibility: 'private',
					isOwner: true,
					createdAt: Date.now(),
					messages: customUseChat.messages as any,
				}
			}
			customUseChat.stop()
		}} />
{/if}
