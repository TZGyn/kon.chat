<script lang="ts">
	import { useChat, type Message } from '@ai-sdk/svelte'
	import { Carta, Markdown } from 'carta-md'
	import DOMPurify from 'isomorphic-dompurify'
	import { cn } from '$lib/utils'
	import { onMount } from 'svelte'
	import { Button, buttonVariants } from '$lib/components/ui/button'
	import { Textarea } from '$lib/components/ui/textarea/index.js'
	import {
		ArrowUpIcon,
		BrainIcon,
		ChevronDownIcon,
		CopyIcon,
		GlobeIcon,
		ImageIcon,
		SearchIcon,
		SendIcon,
		SparklesIcon,
	} from 'lucide-svelte'
	import { toast } from 'svelte-sonner'
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js'
	import { Separator } from '$lib/components/ui/separator'
	import * as Tooltip from '$lib/components/ui/tooltip'
	import { env } from '$env/dynamic/public'
	import { math } from '@cartamd/plugin-math'

	import { useChats } from '../../../state.svelte.js'
	import { Toggle } from '$lib/components/ui/toggle/index.js'
	import { copy } from '$lib/clipboard'
	import { type JSONValue } from 'ai'
	import { code } from '@cartamd/plugin-code'
	import 'katex/dist/katex.css'
	import * as Avatar from '$lib/components/ui/avatar/index.js'
	import * as Dialog from '$lib/components/ui/dialog/index.js'

	export let chat_id
	export let initialMessages: Array<Message>

	let scrollElement: HTMLDivElement | null = null
	let inputElement: HTMLTextAreaElement | null = null

	let selectedModel = {
		name: 'Gemini 2.0 Flash',
		provider: 'google',
		id: 'gemini-2.0-flash-001',
	}
	let search = false

	const { input, handleSubmit, messages, isLoading, data, setData } =
		useChat({
			maxSteps: 1,
			initialMessages: initialMessages,
			api: env.PUBLIC_API_URL + `/chat/${chat_id}`,
			generateId: () => chat_id,
			onFinish: () => {
				scrollToBottom()
				useChats().getChats()
			},
			credentials: 'include',
		})

	const carta = new Carta({
		sanitizer: DOMPurify.sanitize,
		extensions: [code()],
		theme: 'catppuccin-mocha',
	})

	const scrollToBottom = () => {
		if (scrollElement) {
			scrollElement.scrollTop = scrollElement.scrollHeight
		}
	}

	onMount(() => {
		scrollToBottom()
	})

	const adjustInputHeight = () => {
		if (inputElement) {
			inputElement.style.height = 'auto'
			inputElement.style.height = `${inputElement.scrollHeight + 2}px`
		}
	}

	$: $isLoading && $messages && scrollToBottom()

	$: $input && adjustInputHeight()

	const standardModels = [
		{
			name: 'Gemini 2.0 Flash',
			info: '',
			provider: 'google',
			id: 'gemini-2.0-flash-001',
			capabilities: {
				image: true,
				reasoning: false,
			},
		},
		{
			name: 'GPT 4o mini',
			info: '',
			provider: 'openai',
			id: 'gpt-4o-mini',
			capabilities: {
				image: true,
				reasoning: false,
			},
		},

		{
			name: 'GPT 4o',
			info: '',
			provider: 'openai',
			id: 'gpt-4o',
			capabilities: {
				image: true,
				reasoning: false,
			},
		},

		{
			name: 'o3 mini',
			info: '',
			provider: 'openai',
			id: 'o3-mini',
			capabilities: {
				image: false,
				reasoning: true,
			},
		},
	] as const

	const premiumModels = [
		{
			name: 'Clause 3.5 Sonnet',
			info: '',
			provider: 'anthropic',
			id: 'claude-3-5-sonnet',
			capabilities: {
				image: true,
				reasoning: false,
			},
		},
	]
</script>

<div
	bind:this={scrollElement}
	class="flex h-full w-full flex-col items-center overflow-scroll p-4 pb-40">
	<div class="flex w-full max-w-[800px] flex-col gap-4">
		{#each $messages as message, index}
			<div
				class={cn(
					'flex gap-2',
					message.role === 'user'
						? 'place-self-end'
						: 'place-self-start',
				)}>
				<div class="group flex flex-col gap-2">
					{#if message.role !== 'user'}
						<div
							class="ring-border bg-background flex size-8 shrink-0 items-center justify-center rounded-full ring-1">
							<div class="translate-y-px">
								<SparklesIcon size={14} />
							</div>
						</div>
					{/if}
					{#each message.annotations ?? [] as annotation}
						{/* @ts-ignore */ null}
						{#if annotation['type'] === 'search'}
							{/* @ts-ignore */ null}
							{#if annotation?.data}
								<div class="grid max-w-[600px] grid-cols-2 gap-2">
									{/* @ts-ignore */ null}
									{#each annotation?.data.slice(0, 4) as data}
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
												<Dialog.Description
													class="max-h-[calc(100vh-10rem)] overflow-scroll">
													<div class="grid grid-cols-1 gap-2">
														{/* @ts-ignore */ null}
														{#each annotation?.data as data}
															<a href={data.url} target="_blank">
																<div
																	class="bg-secondary hover:bg-accent flex flex-col gap-1 rounded-md border p-3">
																	<span class="line-clamp-1">
																		{data.title}
																	</span>
																	<div
																		class="flex items-center gap-2">
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
												</Dialog.Description>
											</Dialog.Header>
										</Dialog.Content>
									</Dialog.Root>
								{/if}
							{/if}
						{/if}
					{/each}

					{#key message.content}
						{#if message.content.length > 0}
							<div class="bg-background w-fit rounded-xl border p-4">
								<div class="prose dark:prose-invert prose-p:my-0">
									<Markdown {carta} value={message.content} />
								</div>
							</div>
						{/if}
					{/key}

					{#if $isLoading && index === $messages.length - 1}
						{#if $data}
							{/* @ts-ignore */ null}
							{#if $data.filter((data) => data.type === 'message').length > 0}
								<div class="animate-pulse">
									{/* @ts-ignore */ null}
									<!-- prettier-ignore -->
									{$data.filter((data) => data.type === 'message')[$data.filter((data) => data.type === 'message').length-1].message}
								</div>
							{/if}
						{/if}
					{/if}

					{#if message.role !== 'user' && (!$isLoading || index !== $messages.length - 1)}
						<div
							class="invisible flex items-center gap-2 group-hover:visible">
							<Button
								variant="secondary"
								onclick={() => {
									copy(message.content)
									toast.success('Copied Response to Clipboard')
								}}>
								<CopyIcon />
								Copy Response
							</Button>
							{#each message.annotations ?? [] as annotation}
								{/* @ts-ignore */ null}
								{#if annotation['type'] === 'model' && annotation['model'] !== null}
									<div class="text-muted-foreground">
										{/* @ts-ignore */ null}
										Model: {annotation.model}
									</div>
								{/if}
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
		{/each}
		{#if $isLoading && $messages.length > 0 && $messages[$messages.length - 1].role === 'user'}
			<div
				class={cn(
					'flex w-full gap-4 rounded-xl group-data-[role=user]/message:ml-auto group-data-[role=user]/message:w-fit group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:px-3 group-data-[role=user]/message:py-2',
					{
						'group-data-[role=user]/message:bg-muted': true,
					},
				)}>
				<div
					class="ring-border flex size-8 shrink-0 items-center justify-center rounded-full ring-1">
					<SparklesIcon size={14} />
				</div>

				<div class="flex w-full flex-col gap-2">
					<div class="text-muted-foreground flex flex-col gap-4">
						Thinking...
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
<form
	onsubmit={(event) => {
		if ($isLoading) {
			toast.warning(
				'Please wait for the model to finish its response',
			)
		} else {
			setData([])
			handleSubmit(event, {
				body: {
					provider: {
						name: selectedModel.provider,
						model: selectedModel.id,
					},
					search,
				},
			})
		}
	}}
	class="bg-secondary absolute bottom-4 right-1/2 flex h-auto w-[500px] translate-x-1/2 flex-col gap-2 rounded-xl p-3">
	<Textarea
		bind:value={$input}
		bind:ref={inputElement}
		class="max-h-96 min-h-4 resize-none border-none bg-transparent px-4 pb-0 pt-2 focus-visible:ring-0 focus-visible:ring-offset-0"
		placeholder="Send a message..."
		onkeydown={(event) => {
			if (event.key === 'Enter' && !event.shiftKey) {
				event.preventDefault()

				if ($isLoading) {
					toast.warning(
						'Please wait for the model to finish its response',
					)
				} else {
					setData([])
					handleSubmit(event, {
						body: {
							provider: {
								name: selectedModel.provider,
								model: selectedModel.id,
							},
							search,
						},
					})
				}
			}
		}} />

	<div class="flex justify-between">
		<div class="flex items-center gap-2">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger
					class={buttonVariants({ variant: 'ghost' })}>
					{selectedModel.name}
					<ChevronDownIcon />
				</DropdownMenu.Trigger>
				<DropdownMenu.Content
					class="w-[400px] min-w-[8rem]"
					align="start">
					<DropdownMenu.Group>
						<DropdownMenu.GroupHeading class="text-muted-foreground">
							Standard Models
						</DropdownMenu.GroupHeading>
						{#each standardModels as model}
							<DropdownMenu.Item
								class="p-3"
								onclick={() => (selectedModel = model)}>
								<div class="flex w-full items-center justify-between">
									<div class="flex items-center gap-2">
										<div>{model.name}</div>
										{#if model.info}
											<Tooltip.Provider>
												<Tooltip.Root>
													<Tooltip.Trigger
														class={buttonVariants({
															variant: 'outline',
														})}>
														Hover
													</Tooltip.Trigger>
													<Tooltip.Content>
														<p>Add to library</p>
													</Tooltip.Content>
												</Tooltip.Root>
											</Tooltip.Provider>
										{/if}
									</div>
									<div class="flex items-center gap-2">
										{#if model.capabilities.image}
											<div
												class="flex items-center justify-center rounded bg-blue-500/10 p-1 text-blue-500 transition-colors hover:bg-blue-500/20">
												<ImageIcon />
											</div>
										{/if}
										{#if model.capabilities.reasoning}
											<div
												class="flex items-center justify-center rounded bg-purple-500/10 p-1 text-purple-500 transition-colors hover:bg-purple-500/20">
												<BrainIcon />
											</div>
										{/if}
									</div>
								</div>
							</DropdownMenu.Item>
						{/each}
						<DropdownMenu.GroupHeading class="text-muted-foreground">
							Premium Models
						</DropdownMenu.GroupHeading>

						{#each premiumModels as model}
							<DropdownMenu.Item
								class="p-3"
								onclick={() => (selectedModel = model)}>
								<div class="flex w-full items-center justify-between">
									<div class="flex items-center gap-2">
										<div>{model.name}</div>
										{#if model.info}
											<Tooltip.Provider>
												<Tooltip.Root>
													<Tooltip.Trigger
														class={buttonVariants({
															variant: 'outline',
														})}>
														Hover
													</Tooltip.Trigger>
													<Tooltip.Content>
														<p>Add to library</p>
													</Tooltip.Content>
												</Tooltip.Root>
											</Tooltip.Provider>
										{/if}
									</div>
									<div class="flex items-center gap-2">
										{#if model.capabilities.image}
											<div
												class="flex items-center justify-center rounded-sm bg-blue-500/10 p-1 text-blue-500 transition-colors hover:bg-blue-500/20">
												<ImageIcon />
											</div>
										{/if}
										{#if model.capabilities.reasoning}
											<div
												class="flex items-center justify-center rounded-sm bg-purple-500/10 p-1 text-purple-500 transition-colors hover:bg-purple-500/20">
												<BrainIcon />
											</div>
										{/if}
									</div>
								</div>
							</DropdownMenu.Item>
						{/each}
					</DropdownMenu.Group>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
			<Toggle aria-label="toggle search" bind:pressed={search}>
				<GlobeIcon /> Search
			</Toggle>
		</div>
		<Button type="submit" class="" size="icon">
			<SendIcon />
		</Button>
	</div>
</form>
