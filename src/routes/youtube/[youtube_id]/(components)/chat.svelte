<script lang="ts">
	import { Chat, type Message } from '@ai-sdk/svelte'
	import { cn } from '$lib/utils'
	import { onMount } from 'svelte'
	import { toast } from 'svelte-sonner'
	import { PUBLIC_API_URL } from '$env/static/public'

	import { useUser } from '../../../state.svelte'
	import * as Avatar from '$lib/components/ui/avatar/index.js'
	import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte'
	import MessageBlock from '$lib/components/message-block.svelte'
	import MultiModalInput from '$lib/components/multi-modal-input.svelte'
	import { browser } from '$app/environment'
	import { UseAutoScroll } from '$lib/hooks/use-auto-scroll.svelte'
	import { Loader2Icon } from 'lucide-svelte'

	let {
		transcript,
		youtube_id,
	}: { transcript: any[]; youtube_id: string } = $props()

	const autoScroll = new UseAutoScroll()

	const useChat = new Chat({
		maxSteps: 1,
		get initialMessages() {
			return browser
				? JSON.parse(
						localStorage.getItem(`youtube:chat:${youtube_id}`) ||
							'[]',
					)
				: []
		},
		get api() {
			return PUBLIC_API_URL + `/youtube/${youtube_id}`
		},
		generateId: () => youtube_id,
		onFinish: () => {
			autoScroll.scrollToBottom()
			useUser().getUser()
			localStorage.setItem(
				`youtube:chat:${youtube_id}`,
				JSON.stringify(useChat.messages),
			)
		},
		onError: (error) => {
			toast.error(error.message)
		},
		credentials: 'include',
	})
</script>

<ScrollArea
	bind:vp={autoScroll.ref}
	class="flex flex-1 flex-col items-center p-4">
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

<MultiModalInput
	bind:input={useChat.input}
	selectedModelLocator={`model:youtube`}
	handleSubmit={useChat.handleSubmit}
	bind:messages={useChat.messages}
	bind:data={useChat.data}
	status={useChat.status}
	imageUpload={false}
	enableSearch={false}
	customData={() => ({ transcript: transcript })}
	{autoScroll}
	{stop} />
