<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar'
	import { Toggle } from '$lib/components/ui/toggle/index.js'
	import { cn } from '$lib/utils'
	import type { JSONValue, UIMessage } from 'ai'
	import { Button } from '$lib/components/ui/button'
	import {
		ChevronDownIcon,
		Loader2Icon,
		SplitIcon,
		SquareIcon,
	} from 'lucide-svelte'
	import GoogleGroundingSection from '$lib/components/google-grounding-section.svelte'
	import Markdown from './markdown.svelte'
	import Attachments from './message/attachments.svelte'
	import CopyButton from './copy-button.svelte'
	import ToolInvocation from './message/tool-invocation.svelte'

	let {
		isLast,
		message,
		status,
		role,
		data = [],
		halfSize = false,
		branch,
	}: {
		role: 'system' | 'user' | 'assistant' | 'data'
		message: UIMessage
		isLast: boolean
		status: 'submitted' | 'streaming' | 'ready' | 'error'
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
				status !== 'submitted' &&
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

					{#if status === 'streaming' && isLast}
						{#if data}
							{/* @ts-ignore */ null}
							{#if data.filter((data) => data.type === 'message').length > 0}
								<div class="flex animate-pulse items-center gap-2">
									<Loader2Icon class="size-4 animate-spin" />
									{/* @ts-ignore */ null}
									<!-- prettier-ignore -->
									{data.filter((data) => data.type === 'message')[data.filter((data) => data.type === 'message').length-1].message}
								</div>
							{/if}
						{/if}
					{/if}

					{#each message.annotations ?? [] as annotation}
						{/* @ts-ignore */ null}
						{#if annotation['type'] === 'model' && annotation['model'] !== null}
							<div class="text-muted-foreground">
								{/* @ts-ignore */ null}
								Model: {annotation.model}
							</div>
						{/if}
					{/each}
				</div>
			{/if}

			{#if message.parts.length > 0}
				<div class="flex w-full flex-col gap-5">
					{#each message.parts as part, index (index)}
						{#if part.type === 'tool-invocation'}
							<ToolInvocation
								toolInvocation={part.toolInvocation}
								{message} />
						{:else if part.type === 'reasoning'}
							<Toggle
								size="sm"
								class="text-muted-foreground group peer w-fit border">
								Reasoning
								<ChevronDownIcon
									class={'transition-transform group-data-[state="on"]:rotate-180'} />
							</Toggle>
							<div
								class="text-muted-foreground hidden rounded-md border p-2 text-sm peer-data-[state='on']:block">
								{part.reasoning}
							</div>
						{:else if part.type === 'text'}
							<div
								class={cn(
									'w-fit rounded-xl',
									message.role === 'user'
										? 'bg-secondary place-self-end p-4'
										: 'bg-background',
								)}>
								<div
									class="prose prose-neutral dark:prose-invert prose-p:my-0">
									<Markdown content={part.text} id={message.id} />
								</div>
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
							class="bg-destructive/20 border-destructive/50 flex w-full items-center gap-2 rounded-xl border px-4 py-3">
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
					{#if message.content}
						<CopyButton text={message.content} />
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
