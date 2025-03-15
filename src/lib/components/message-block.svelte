<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar'
	import * as Dialog from '$lib/components/ui/dialog'
	import { ScrollArea } from '$lib/components/ui/scroll-area'
	import { Toggle } from '$lib/components/ui/toggle/index.js'
	import { cn } from '$lib/utils'
	import type { JSONValue, UIMessage } from 'ai'
	import { Button, buttonVariants } from '$lib/components/ui/button'
	import {
		ChevronDownIcon,
		CopyIcon,
		FileTextIcon,
		Loader2Icon,
	} from 'lucide-svelte'
	import { copy } from '$lib/clipboard'
	import { toast } from 'svelte-sonner'
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
	}: {
		role: 'system' | 'user' | 'assistant' | 'data'
		message: UIMessage
		isLast: boolean
		status: 'submitted' | 'streaming' | 'ready' | 'error'
		data?: JSONValue[]
		halfSize?: boolean
	} = $props()

	let hasReasoning = $derived(
		message.parts.find((part) => part.type === 'reasoning') !==
			undefined,
	)
	let reasoningPart = $derived(
		message.parts.find((part) => part.type === 'reasoning'),
	)

	let toolInvocations = $derived(
		message.parts.filter((part) => part.type === 'tool-invocation'),
	)
</script>

{#key message.id}
	<div
		class={cn(
			'flex gap-2',
			role === 'user' ? 'place-self-end' : 'place-self-start',
			isLast &&
				status !== 'submitted' &&
				(halfSize
					? '@6xl:min-h-[calc(100svh-25rem)] min-h-[calc(50svh-25rem)]'
					: 'min-h-[calc(100svh-25rem)]'),
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
								<Avatar.Fallback class="size-4 bg-opacity-0">
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
			{#each toolInvocations as toolInvocation}
				<ToolInvocation
					toolInvocation={toolInvocation.toolInvocation}
					{message} />
			{/each}

			{#if hasReasoning}
				<Toggle
					size="sm"
					class="text-muted-foreground group peer w-fit border">
					Reasoning
					<ChevronDownIcon
						class={'transition-transform group-data-[state="on"]:rotate-180'} />
				</Toggle>
			{/if}

			{#if reasoningPart}
				<div
					class="text-muted-foreground hidden rounded-md border p-2 text-sm peer-data-[state='on']:block">
					{reasoningPart.reasoning}
				</div>
			{/if}
			{#if message.parts.length > 0}
				{#each message.parts as part, index (index)}
					{#if part.type === 'text'}
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

			{#if message.role !== 'user'}
				<div
					class={cn(
						'flex items-center gap-2',
						status !== 'streaming' || !isLast
							? 'visible'
							: 'invisible',
					)}>
					{#if message.content}
						<CopyButton text={message.content} />
					{/if}
				</div>
			{/if}
		</div>
	</div>
{/key}
