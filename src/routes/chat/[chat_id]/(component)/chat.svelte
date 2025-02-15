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
		CloudLightningIcon,
		CopyIcon,
		GlobeIcon,
		ImageIcon,
		SearchIcon,
		SendIcon,
		SparklesIcon,
		ZapIcon,
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
	// import 'katex/dist/katex.css'
	import * as Avatar from '$lib/components/ui/avatar/index.js'
	import * as Dialog from '$lib/components/ui/dialog/index.js'
	import * as Accordion from '$lib/components/ui/accordion/index.js'
	import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte'
	import GoogleIcon from './google-icon.svelte'
	import OpenaiIcon from './openai-icon.svelte'
	import GroqIcon from './groq-icon.svelte'
	import AnthropicIcon from './anthropic-icon.svelte'

	export let chat_id
	export let initialMessages: Array<Message>
	export let plan: 'free' | 'basic' | 'pro' | 'owner' | undefined

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
				fast: false,
				reasoning: false,
			},
			disabled: false,
		},
		{
			name: 'GPT 4o mini',
			info: '',
			provider: 'openai',
			id: 'gpt-4o-mini',
			capabilities: {
				image: true,
				fast: false,
				reasoning: false,
			},
			disabled: plan === undefined || plan === 'free',
		},
		{
			name: 'GPT 4o',
			info: '',
			provider: 'openai',
			id: 'gpt-4o',
			capabilities: {
				image: true,
				fast: false,
				reasoning: false,
			},
			disabled: plan === undefined || plan === 'free',
		},
		{
			name: 'o3 mini',
			info: '',
			provider: 'openai',
			id: 'o3-mini',
			capabilities: {
				image: false,
				fast: false,
				reasoning: true,
			},
			disabled: plan === undefined || plan === 'free',
		},
		{
			name: 'DeepSeek R1 (Groq)',
			info: '',
			provider: 'groq',
			id: 'deepseek-r1-distill-llama-70b',
			capabilities: {
				image: false,
				fast: true,
				reasoning: true,
			},
			disabled: plan === undefined || plan === 'free',
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
			disabled:
				plan === undefined || plan === 'free' || plan === 'basic',
		},
	]
</script>

<ScrollArea
	bind:vp={scrollElement}
	class="flex flex-1 flex-col items-center p-4 pb-40">
	<div class="flex w-full flex-col items-center">
		<div class="flex w-full max-w-[600px] flex-col gap-4">
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
							</div>
						{/if}
						{#each message.annotations ?? [] as annotation}
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
													<Dialog.Title>
														Sources and links
													</Dialog.Title>
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
														</ScrollArea>
													</Dialog.Description>
												</Dialog.Header>
											</Dialog.Content>
										</Dialog.Root>
									{/if}
								{/if}
							{/if}
						{/each}

						{#key message.parts}
							{#if message.parts.length > 0}
								{#if message.parts.find((part) => part.type === 'reasoning') !== undefined}
									<Toggle
										size="sm"
										class="text-muted-foreground group peer w-fit border">
										Reasoning
										<ChevronDownIcon
											class={'transition-transform group-data-[state="on"]:rotate-180'} />
									</Toggle>
								{/if}
								{#each message.parts as part}
									{#if part.type === 'reasoning'}
										<div
											class="text-muted-foreground hidden rounded-md border p-2 text-sm peer-data-[state='on']:block">
											{part.reasoning}
										</div>
									{/if}
									{#if part.type === 'text'}
										<div
											class={cn(
												'rounded-xl border p-4',
												message.role === 'user'
													? 'bg-secondary'
													: 'bg-background',
											)}>
											<div
												class="prose dark:prose-invert prose-p:my-0">
												<Markdown {carta} value={part.text} />
											</div>
										</div>
									{/if}
								{/each}
							{/if}
						{/key}

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
</ScrollArea>
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
					{@render modelIcon(selectedModel.provider)}
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
								disabled={model.disabled}
								class="p-3"
								onclick={() => (selectedModel = model)}>
								<div class="flex w-full items-center justify-between">
									<div class="flex items-center gap-2">
										{@render modelIcon(model.provider)}
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
										{#if model.capabilities.fast}
											<div
												class="flex items-center justify-center rounded bg-yellow-500/10 p-1 text-yellow-500 transition-colors hover:bg-yellow-500/20">
												<ZapIcon />
											</div>
										{/if}
										{#if model.capabilities.reasoning}
											<div
												class="flex items-center justify-center rounded bg-purple-500/10 p-1 text-purple-500 transition-colors hover:bg-purple-500/20">
												<BrainIcon />
											</div>
										{/if}
										{#if model.capabilities.image}
											<div
												class="flex items-center justify-center rounded bg-blue-500/10 p-1 text-blue-500 transition-colors hover:bg-blue-500/20">
												<ImageIcon />
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
								disabled={model.disabled}
								class="p-3"
								onclick={() => (selectedModel = model)}>
								<div class="flex w-full items-center justify-between">
									<div class="flex items-center gap-2">
										{@render modelIcon(model.provider)}
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

{#snippet modelIcon(provider: string)}
	{#if provider === 'google'}
		<GoogleIcon />
	{:else if provider === 'openai'}
		<OpenaiIcon />
	{:else if provider === 'groq'}
		<GroqIcon />
	{:else if provider === 'anthropic'}
		<AnthropicIcon />
	{/if}
{/snippet}
