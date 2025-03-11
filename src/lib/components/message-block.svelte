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
		annotations = [],
		halfSize = false,
	}: {
		role: 'system' | 'user' | 'assistant' | 'data'
		message: UIMessage
		isLast: boolean
		status: 'submitted' | 'streaming' | 'ready' | 'error'
		data?: JSONValue[]
		annotations?: JSONValue[]
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
			{#each annotations as annotation}
				{/* @ts-ignore */ null}
				{#if annotation['type'] === 'search'}
					{/* @ts-ignore */ null}
					{#if annotation?.data}
						<div class="grid grid-cols-2 gap-2">
							{/* @ts-ignore */ null}
							{#each annotation?.data.slice(0, 4) as data}
								<a href={data.url} target="_blank">
									<div
										class="bg-secondary hover:bg-accent flex flex-col gap-1 rounded-md border p-3">
										<span class="line-clamp-1">
											{data.title}
										</span>
										<div class="flex items-center gap-2">
											<Avatar.Root class="size-4 overflow-visible">
												<Avatar.Image
													src={'https://www.google.com/s2/favicons?sz=128&domain_url=' +
														data.url}
													alt="favicon"
													class="size-4" />
												<Avatar.Fallback class="size-4 bg-opacity-0">
													<img src="/logo.png" alt="favicon" />
												</Avatar.Fallback>
											</Avatar.Root>
											<span
												class="text-muted-foreground line-clamp-1 text-sm">
												{data.url}
											</span>
										</div>
									</div>
								</a>
							{/each}
						</div>

						{/* @ts-ignore */ null}
						{#if annotation?.data.length > 4}
							<Dialog.Root>
								<Dialog.Trigger
									class={cn(
										buttonVariants({ variant: 'outline' }),
										'w-full',
									)}>
									View All Sources
								</Dialog.Trigger>
								<Dialog.Content>
									<Dialog.Header>
										<Dialog.Title>Sources and links</Dialog.Title>
										<Dialog.Description>
											<ScrollArea>
												<div
													class="grid max-h-[calc(100vh-10rem)] grid-cols-1 gap-2">
													{/* @ts-ignore */ null}
													{#each annotation?.data as data}
														<a href={data.url} target="_blank">
															<div
																class="bg-secondary hover:bg-accent flex flex-col gap-1 rounded-md border p-3">
																<span class="line-clamp-1">
																	{data.title}
																</span>
																<div class="flex items-center gap-2">
																	<Avatar.Root
																		class="size-4 overflow-visible">
																		<Avatar.Image
																			src={'https://www.google.com/s2/favicons?sz=128&domain_url=' +
																				data.url}
																			alt="favicon"
																			class="size-4" />
																		<Avatar.Fallback
																			class="size-4 bg-opacity-0">
																			<img
																				src="/logo.png"
																				alt="favicon" />
																		</Avatar.Fallback>
																	</Avatar.Root>
																	<span
																		class="text-muted-foreground line-clamp-1 text-sm">
																		{data.url}
																	</span>
																</div>
															</div>
														</a>
													{/each}
												</div>
											</ScrollArea>
										</Dialog.Description>
									</Dialog.Header>
								</Dialog.Content>
							</Dialog.Root>
						{/if}
					{/if}
				{/if}
			{/each}
			{#each toolInvocations as toolInvocation}
				<ToolInvocation
					toolInvocation={toolInvocation.toolInvocation} />
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
						'flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100',
						status !== 'streaming' || !isLast
							? 'visible'
							: 'invisible',
					)}>
					<CopyButton text={message.content} />
					{#each message.annotations ?? [] as annotation}
						{/* @ts-ignore */ null}
						{#if annotation['type'] === 'search-error'}
							<div class="text-destructive">
								{/* @ts-ignore */ null}
								Error: {annotation.message}
							</div>
						{/if}
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/key}
