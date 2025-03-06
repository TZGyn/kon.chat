<script lang="ts">
	import { useChat, type Message } from '@ai-sdk/svelte'
	import { cn } from '$lib/utils'
	import { onMount } from 'svelte'
	import { toast } from 'svelte-sonner'
	import { PUBLIC_API_URL } from '$env/static/public'

	import { useChats, useUser } from '../../../state.svelte.js'
	import 'katex/dist/katex.css'
	import * as Avatar from '$lib/components/ui/avatar/index.js'
	import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte'
	import { page } from '$app/stores'
	import { goto, replaceState } from '$app/navigation'
	import MessageBlock from '$lib/components/message-block.svelte'
	import MultiModalInput from '$lib/components/multi-modal-input.svelte'

	export let chat_id
	export let initialMessages: Array<Message>

	let scrollElement: HTMLDivElement | null = null

	const {
		input,
		handleSubmit,
		messages,
		status,
		data,
		setData,
		setMessages,
	} = useChat({
		maxSteps: 1,
		initialMessages: initialMessages,
		api: PUBLIC_API_URL + `/chat/${chat_id}`,
		generateId: () => chat_id,
		onFinish: () => {
			if ($page.url.searchParams) {
				$page.url.searchParams.delete('type')
				replaceState($page.url, $page.state)
			}
			scrollToBottom()
			useChats().getChats()
			useUser().getUser()
			localStorage.setItem(
				`chat:${chat_id}`,
				JSON.stringify($messages),
			)
		},
		onError: (error) => {
			toast.error(error.message)
		},
		credentials: 'include',
	})

	const scrollToBottom = () => {
		if (scrollElement) {
			scrollElement.scrollTop = scrollElement.scrollHeight
		}
	}

	onMount(() => {
		scrollToBottom()
	})

	$: ($status === 'streaming' || $status === 'submitted') &&
		$messages &&
		scrollToBottom()
</script>

<ScrollArea
	bind:vp={scrollElement}
	class="flex flex-1 flex-col items-center p-4">
	<div class="flex w-full flex-col items-center pb-40 pt-20">
		<div class="flex w-full max-w-[600px] flex-col gap-4">
			{#each $messages as message, index}
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
							<div class="animate-pulse">Submitting Prompt</div>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</ScrollArea>

<MultiModalInput
	bind:input={$input}
	selectedModelLocator={`model:chat:${chat_id}`}
	{handleSubmit}
	messages={$messages}
	{setData}
	{setMessages}
	status={$status}
	imageUpload={true}
	enableSearch={true} />
