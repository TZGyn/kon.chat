<script lang="ts">
	import { Chat, type Message } from '@ai-sdk/svelte'
	import { cn } from '$lib/utils'
	import { onMount } from 'svelte'
	import { toast } from 'svelte-sonner'

	import * as Avatar from '$lib/components/ui/avatar/index.js'
	import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte'
	import MessageBlock from '$lib/components/message-block.svelte'
	import MultiModalInput from '$lib/components/multi-modal-input.svelte'
	import { browser } from '$app/environment'
	import { UseAutoScroll } from '$lib/hooks/use-auto-scroll.svelte'
	import { Loader2Icon } from 'lucide-svelte'
	import { PUBLIC_API_URL } from '$env/static/public'

	let { markdown, pdf_id }: { markdown: string; pdf_id: string } =
		$props()

	const autoScroll = new UseAutoScroll()

	const useChat = new Chat({
		maxSteps: 1,
		get initialMessages() {
			return browser
				? JSON.parse(
						localStorage.getItem(`pdf:chat:${pdf_id}`) || '[]',
					)
				: []
		},
		get api() {
			return `${PUBLIC_API_URL}/documents/pdf/${pdf_id}`
		},
		get id() {
			return pdf_id
		},
		onFinish: () => {
			autoScroll.scrollToBottom()
			localStorage.setItem(
				`pdf:chat:${pdf_id}`,
				JSON.stringify(useChat.messages),
			)
		},
		onError: (error) => {
			toast.error(error.message)
		},
		credentials: 'include',
	})
</script>

<div
	bind:this={autoScroll.ref}
	class="flex flex-1 flex-col items-center overflow-y-scroll">
	<div class="flex w-full flex-col items-center pt-20 pb-40">
		<div
			class="@container/chat flex w-full max-w-[600px] flex-col gap-4">
			{#each useChat.messages as message, index (index)}
				<MessageBlock
					data={useChat.data}
					message={{ ...message, status: 'ready' }}
					role={message.role}
					halfSize={true}
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
										<Avatar.Fallback class="bg-opacity-0 size-4">
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
</div>

<MultiModalInput
	bind:input={useChat.input}
	selectedModelLocator={`model:pdf:${pdf_id}`}
	handleSubmit={useChat.handleSubmit}
	bind:messages={useChat.messages}
	bind:data={useChat.data}
	imageUpload={false}
	enableSearch={false}
	customData={() => ({ markdown: markdown })}
	{autoScroll} />
