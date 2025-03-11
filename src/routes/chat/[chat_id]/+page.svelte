<script lang="ts">
	import type { Attachment, CoreToolMessage } from 'ai'
	import { useChat, type Message } from '@ai-sdk/svelte'
	import {
		fillMessageParts,
		type ToolInvocation,
	} from '@ai-sdk/ui-utils'
	import { customFetch } from '$lib/fetch'
	import { type GoogleGenerativeAIProviderMetadata } from '@ai-sdk/google'
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
	import { Loader2Icon } from 'lucide-svelte'
	import MultiModalInput from '$lib/components/multi-modal-input.svelte'
	import { onMount } from 'svelte'
	import { isEqual, unionWith } from 'lodash'

	let chat_id = $derived(page.params.chat_id)

	function convertToUIMessages(
		messages: Array<{
			model: string | null
			provider: string | null
			id: string
			createdAt: number
			content: unknown
			role: string
			providerMetadata: any
			chatId: string
			braveData: any
		}>,
	): Array<Message> {
		return messages.reduce(
			(chatMessages: Array<Message>, message) => {
				if (message.role === 'tool') {
					return addToolMessageToChat({
						toolMessage: message as CoreToolMessage,

						messages: chatMessages,
					})
				}

				let textContent = ''
				let reasoningContent = ''
				const toolInvocations: Array<ToolInvocation> = []
				const attachments: Array<Attachment> = []

				if (typeof message.content === 'string') {
					textContent = message.content
				} else if (Array.isArray(message.content)) {
					for (const content of message.content) {
						if (content.type === 'text') {
							textContent += content.text
						} else if (content.type === 'reasoning') {
							reasoningContent += content.reasoning ?? ''
						} else if (content.type === 'tool-call') {
							toolInvocations.push({
								state: 'call',
								toolCallId: content.toolCallId,
								toolName: content.toolName,
								args: content.args,
							})
						} else if (content.type === 'image') {
							const filename = (content.image as string)
								.split('/')
								.pop()
							if (!filename) continue
							const filetype = filename.split('.').pop()
							if (
								filetype === 'png' ||
								filetype === 'jpg' ||
								filetype === 'jpeg'
							) {
								attachments.push({
									url: content.image,
									contentType: `image/${filetype}`,
									name: filename.substring(
										filename.indexOf('-') + 1,
										filename.length,
									),
								})
							}
						} else if (content.type === 'file') {
							const filename = (content.data as string)
								.split('/')
								.pop()
							if (!filename) continue
							attachments.push({
								url: content.data,
								contentType: content.mimeType,
								name: filename.substring(
									filename.indexOf('-') + 1,
									filename.length,
								),
							})
						}
					}
				}

				chatMessages.push({
					id: message.id,
					role: message.role as Message['role'],
					content: textContent,
					reasoning: reasoningContent,
					toolInvocations,
					annotations: [
						{ type: 'model', model: message.model },
						{
							type: 'search',
							data:
								message.braveData?.web?.results?.map(
									(result: any) => {
										return {
											url: result.url,
											description: result.description,
											title: result.title,
											pageAge: result.page_age,
										}
									},
								) || [],
						},
						message.provider === 'google' && {
							type: 'google-grounding',
							data: message.providerMetadata
								?.google as GoogleGenerativeAIProviderMetadata,
						},
					],
					experimental_attachments: attachments,
				})

				return chatMessages
			},
			[],
		)

		function addToolMessageToChat({
			toolMessage,
			messages,
		}: {
			toolMessage: CoreToolMessage
			messages: Array<Message>
		}): Array<Message> {
			return messages.map((message) => {
				if (message.toolInvocations) {
					return {
						...message,
						toolInvocations: message.toolInvocations.map(
							(toolInvocation) => {
								const toolResult = toolMessage.content.find(
									(tool) =>
										tool.toolCallId === toolInvocation.toolCallId,
								)

								if (toolResult) {
									return {
										...toolInvocation,
										state: 'result',
										result: toolResult.result,
									}
								}

								return toolInvocation
							},
						),
					}
				}

				return message
			})
		}
	}

	const getChat = async () => {
		const data = (
			await customFetch<{
				chat: {
					id: string
					createdAt: number
					userId: string
					title: string
					messages: {
						id: string
						createdAt: number
						chatId: string
						role: string
						content: unknown
						model: string | null
						providerMetadata: any
						braveData: any
						provider: string | null
					}[]
				} | null
			}>(`/chat/${chat_id}`)
		).chat

		chat.value = data?.messages || []
		const serverMessages = convertToUIMessages(chat.value)
		setMessages(
			unionWith(fillMessageParts(serverMessages), $messages, isEqual),
		)
	}

	let chat = $derived(
		useLocalStorage<any>(`chat:${chat_id}`, undefined),
	)

	onMount(() => {})

	$effect(() => {
		const messages = localStorage.getItem(`chat:${chat_id}`)

		setMessages(convertToUIMessages(JSON.parse(messages || '[]')))
		getChat()
	})

	const autoScroll = new UseAutoScroll()

	const chats = useChats()

	const {
		input,
		handleSubmit,
		messages,
		status,
		data,
		setData,
		setMessages,
	} = $derived(
		useChat({
			initialMessages: [],
			api: PUBLIC_API_URL + `/chat/${chat_id}`,
			generateId: () => chat_id,
			onFinish: () => {
				if (page.url.searchParams) {
					page.url.searchParams.delete('type')
					replaceState(page.url, page.state)
				}
				chats.getChats()
				useUser().getUser()
				chat.value = $messages
			},
			onError: (error) => {
				console.log(error)
				toast.error(error.message)
			},
			credentials: 'include',
		}),
	)
</script>

<div class="flex flex-1 overflow-hidden">
	<ScrollArea
		bind:vp={autoScroll.ref}
		class="flex flex-1 flex-col items-center p-4">
		<div class="flex w-full flex-col items-center pb-40 pt-20">
			<div class="flex w-full max-w-[600px] flex-col gap-4">
				{#each $messages as message, index (index)}
					<MessageBlock
						annotations={message.annotations}
						data={$data}
						{message}
						role={message.role}
						status={$status}
						isLast={index === $messages.length - 1} />
				{/each}
				{#if $status === 'submitted'}
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
</div>
<MultiModalInput
	bind:input={$input}
	selectedModelLocator={`model:chat:${chat_id}`}
	{handleSubmit}
	messages={$messages}
	{setData}
	{setMessages}
	status={$status}
	imageUpload={true}
	fileUpload={true}
	enableSearch={true}
	{autoScroll} />
