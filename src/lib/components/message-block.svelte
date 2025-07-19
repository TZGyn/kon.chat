<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar'
	import { cn } from '$lib/utils'
	import type { JSONValue, UIMessage } from 'ai'
	import { Button } from '$lib/components/ui/button'
	import { Loader2Icon, SplitIcon, SquareIcon } from 'lucide-svelte'
	import GoogleGroundingSection from '$lib/components/google-grounding-section.svelte'
	import Markdown from './markdown'
	import Attachments from './message/attachments.svelte'
	import CopyButton from './copy-button.svelte'
	import ToolInvocation from './message/tool-invocation.svelte'
	import Reasoning from './markdown/reasoning.svelte'
	import * as m from '$lib/paraglide/messages'
	import type { ChatUIMessage } from '$lib/message'

	let {
		isLast,
		message,
		role,
		data = [],
		halfSize = false,
		branch,
	}: {
		role: 'system' | 'user' | 'assistant' | 'data'
		message: ChatUIMessage
		isLast: boolean
		data?: JSONValue[]
		halfSize?: boolean
		branch?: () => void
	} = $props()
</script>

{#key message.id}
	<div
		class={cn(
			'flex gap-2',
			role === 'user' ? 'place-self-end' : 'place-self-start',
			isLast &&
				(halfSize
					? 'min-h-[calc(50svh-18rem)] @6xl:min-h-[calc(100svh-18rem)]'
					: 'min-h-[calc(100svh-18rem)]'),
		)}>
		<div class="group flex flex-col gap-2">
			{#if role !== 'user'}
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

					{#if message.status === 'streaming'}
						<div class="flex animate-pulse items-center gap-2">
							<Loader2Icon class="size-4 animate-spin" />
							{#if data}
								{/* @ts-ignore */ null}
								{#if data.filter((data) => data.type === 'message').length > 0}
									{/* @ts-ignore */ null}
									<!-- prettier-ignore -->
									{data.filter((data) => data.type === 'message')[data.filter((data) => data.type === 'message').length-1].message}
								{/if}
							{/if}
						</div>
					{/if}

					{#each message.annotations ?? [] as annotation}
						{/* @ts-ignore */ null}
						{#if annotation['type'] === 'model' && annotation['model'] !== null}
							<div class="text-muted-foreground">
								{/* @ts-ignore */ null}
								{m.model()}: {annotation.model}
							</div>
						{/if}
					{/each}
				</div>
			{/if}

			{#if message.parts.length > 0}
				<div class="flex w-[100cqw] flex-col gap-5">
					{#each message.parts as part, index (index)}
						{#if part.type === 'tool-invocation'}
							<ToolInvocation
								toolInvocation={part.toolInvocation}
								{message} />
						{:else if part.type === 'reasoning'}
							<Reasoning reasoning={part.reasoning} />
						{:else if part.type === 'text'}
							<div
								class={cn(
									'max-w-[100cqw] rounded-xl',
									message.role === 'user'
										? 'bg-secondary w-fit place-self-end p-4'
										: 'bg-background w-screen',
								)}>
								<Markdown
									content={part.text}
									id={message.id}
									class={message.role === 'user'
										? 'w-fit'
										: 'max-w-[100cqw]'} />
							</div>
						{/if}
					{/each}
				</div>
			{/if}
			<Attachments attachments={message.experimental_attachments} />

			{#each message.annotations ?? [] as annotation}
				{/* @ts-ignore */ null}
				{#if annotation['type'] === 'google-grounding'}
					{/* @ts-ignore */ null}
					{#if annotation?.data}
						{/* @ts-ignore */ null}
						<!-- prettier-ignore -->
						<GoogleGroundingSection metadata={annotation?.data}/>
					{/if}
				{/if}
			{/each}

			{#each message.annotations ?? [] as annotation}
				{/* @ts-ignore */ null}
				{#if annotation['type'] === 'kon_chat'}
					{/* @ts-ignore */ null}
					{#if annotation?.status === 'error'}
						<div
							class="bg-destructive/20 border-destructive/50 flex w-[100cqw] items-center gap-2 rounded border px-4 py-3">
							{/* @ts-ignore */ null}
							{#if annotation?.error.type === 'stopped_by_user'}
								<SquareIcon class="size-4" />
							{/if}
							<span class="text-sm">
								{/* @ts-ignore */ null}
								{annotation?.error.message}
							</span>
						</div>
					{/if}
				{/if}
			{/each}

			{#if message.role !== 'user'}
				<div
					class={cn(
						'flex items-center',
						status !== 'streaming' || !isLast
							? 'visible'
							: 'invisible',
					)}>
					{#if message.parts.filter((part) => part.type === 'text' && part.text)}
						<CopyButton
							text={message.parts
								.map((part) => {
									if (part.type === 'text') {
										return part.text
									}
									return ''
								})
								.join('\n')
								.trim()} />
					{/if}
					{#if branch}
						<Button
							size="icon"
							variant="ghost"
							onclick={() => branch()}>
							<SplitIcon class="rotate-180" />
						</Button>
					{/if}
				</div>
			{/if}
		</div>
	</div>
{/key}
