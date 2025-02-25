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
		Loader2Icon,
		SearchIcon,
		SendIcon,
		SparklesIcon,
		ZapIcon,
	} from 'lucide-svelte'
	import { toast } from 'svelte-sonner'
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js'
	import { Separator } from '$lib/components/ui/separator'
	import * as Tooltip from '$lib/components/ui/tooltip'
	import { PUBLIC_API_URL } from '$env/static/public'
	import { math } from '@cartamd/plugin-math'

	import { useChats, useUser } from '../../../state.svelte.js'
	import { Toggle } from '$lib/components/ui/toggle/index.js'
	import { copy } from '$lib/clipboard'
	import { type Attachment, type JSONValue } from 'ai'
	import { code } from '@cartamd/plugin-code'
	import 'katex/dist/katex.css'
	import * as Avatar from '$lib/components/ui/avatar/index.js'
	import * as Dialog from '$lib/components/ui/dialog/index.js'
	import * as Accordion from '$lib/components/ui/accordion/index.js'
	import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte'
	import GoogleIcon from './google-icon.svelte'
	import OpenaiIcon from './openai-icon.svelte'
	import GroqIcon from './groq-icon.svelte'
	import AnthropicIcon from './anthropic-icon.svelte'
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import GoogleGroundingSection from './google-grounding-section.svelte'
	import UploadFileCard from './upload-file-card.svelte'

	export let chat_id
	export let initialMessages: Array<Message>
	export let plan: 'free' | 'basic' | 'pro' | 'owner' | undefined

	let scrollElement: HTMLDivElement | null = null
	let inputElement: HTMLTextAreaElement | null = null

	let imageInput: HTMLInputElement | null = null
	let fileInputs: FileList | undefined

	$: appendToAttachments(fileInputs)

	const appendToAttachments = (filelist?: FileList) => {
		if (!filelist) return

		const items = Array.from(filelist).map((file) => ({
			file: file,
			url: '',
			status: 'submitted' as const,
		}))

		attachments.push(...items)
		attachments = attachments
	}

	let attachments: {
		file: File
		url?: string
		status: 'submitted' | 'uploading' | 'error' | 'ready'
	}[] = [
		// {
		// 	contentType: 'image/png',
		// 	url: 'https://pub-ebd1464da2b7495383cfdcb47dd2acd9.r2.dev/ok.png',
		// },
	]

	let selectedModel = {
		name: 'Gemini 2.0 Flash',
		provider: 'google',
		id: 'gemini-2.0-flash-001',
		capabilities: {
			image: true,
			fast: false,
			reasoning: false,
			searchGrounding: true,
		},
	}
	let search = false
	let searchGrounding = false

	function customSubmit(event: Event) {
		console.log(attachments)
		if (
			attachments.some(
				(attachment) => attachment.status === 'uploading',
			)
		) {
			toast.warning(
				'Please wait for the files to complete the upload',
			)
			return
		}

		if ($status === 'error') {
			setMessages($messages.slice(0, -1)) // remove last message
		}
		if ($status === 'streaming') {
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
					searchGrounding,
				},
				experimental_attachments: attachments
					.filter(
						(attachment) =>
							attachment.url !== undefined &&
							attachment.status === 'ready',
					)
					.map((attachment) => ({
						contentType: attachment.file.type,
						url: attachment.url!,
						name: attachment.file.name,
					})),
			})
			attachments = []
		}
	}

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
				goto(`?${$page.url.searchParams.toString()}`, {
					keepFocus: true,
				})
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

	const carta = new Carta({
		sanitizer: DOMPurify.sanitize,
		extensions: [math(), code()],
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

	$: ($status === 'streaming' || $status === 'submitted') &&
		$messages &&
		scrollToBottom()

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
				searchGrounding: true,
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
				searchGrounding: false,
			},
			disabled: plan === undefined || plan === 'free',
		},
		// {
		// 	name: 'GPT 4o',
		// 	info: '',
		// 	provider: 'openai',
		// 	id: 'gpt-4o',
		// 	capabilities: {
		// 		image: true,
		// 		fast: false,
		// 		reasoning: false,
		// 		searchGrounding: false,
		// 	},
		// 	disabled: plan === undefined || plan === 'free',
		// },
		// {
		// 	name: 'o3 mini',
		// 	info: '',
		// 	provider: 'openai',
		// 	id: 'o3-mini',
		// 	capabilities: {
		// 		image: false,
		// 		fast: false,
		// 		reasoning: true,
		// 		searchGrounding: false,
		// 	},
		// 	disabled: plan === undefined || plan === 'free',
		// },
		{
			name: 'DeepSeek R1 (Groq)',
			info: '',
			provider: 'groq',
			id: 'deepseek-r1-distill-llama-70b',
			capabilities: {
				image: false,
				fast: true,
				reasoning: true,
				searchGrounding: false,
			},
			disabled: plan === undefined || plan === 'free',
		},
		{
			name: 'Llama 3.3 (Groq)',
			info: '',
			provider: 'groq',
			id: 'llama-3.3-70b-versatile',
			capabilities: {
				image: false,
				fast: true,
				reasoning: false,
				searchGrounding: false,
			},
			disabled: plan === undefined || plan === 'free',
		},
	] as const

	const premiumModels = [
		{
			name: 'Clause 3.5 Sonnet',
			info: '',
			provider: 'anthropic',
			id: 'claude-3-5-sonnet-latest',
			capabilities: {
				image: true,
				fast: false,
				reasoning: false,
				searchGrounding: false,
			},
			disabled:
				plan === undefined || plan === 'free' || plan === 'basic',
		},
		{
			name: 'Clause 3.7 Sonnet',
			info: '',
			provider: 'anthropic',
			id: 'claude-3-7-sonnet-20250219',
			capabilities: {
				image: true,
				fast: false,
				reasoning: true,
				searchGrounding: false,
			},
			disabled:
				plan === undefined || plan === 'free' || plan === 'basic',
		},
	]
</script>

<ScrollArea
	bind:vp={scrollElement}
	class="flex flex-1 flex-col items-center p-4">
	<div class="flex w-full flex-col items-center pb-40 pt-20">
		<div class="flex w-full max-w-[600px] flex-col gap-4">
			{#each $messages as message, index}
				<div
					class={cn(
						'flex gap-2',
						message.role === 'user'
							? 'place-self-end'
							: 'place-self-start',
						index === $messages.length - 1 &&
							$status !== 'submitted' &&
							'min-h-[calc(100vh-25rem)]',
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

								{#if $status === 'streaming' && index === $messages.length - 1}
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
												'rounded-xl',
												message.role === 'user'
													? 'bg-secondary p-4'
													: 'bg-background',
											)}>
											<div
												class="prose prose-neutral dark:prose-invert prose-p:my-0">
												<Markdown {carta} value={part.text} />
											</div>
										</div>
									{/if}
								{/each}
							{/if}
						{/key}
						{#if message.experimental_attachments}
							{#each message.experimental_attachments as attachment}
								{#if attachment.contentType?.startsWith('image/')}
									<div
										class="bg-background min-h-16 min-w-16 overflow-hidden rounded-lg border">
										<img
											src={attachment.url}
											alt={attachment.name}
											class="w-full" />
									</div>
								{/if}
							{/each}
						{/if}

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
									$status !== 'streaming' ||
										index !== $messages.length - 1
										? 'visible'
										: 'invisible',
								)}>
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
<form
	onsubmit={customSubmit}
	class="bg-secondary absolute bottom-0 right-1/2 flex h-auto w-full max-w-[700px] translate-x-1/2 flex-col gap-2 rounded-xl rounded-b-none p-3">
	<Textarea
		bind:value={$input}
		bind:ref={inputElement}
		class="max-h-96 min-h-4 resize-none border-none bg-transparent px-4 pb-0 pt-2 focus-visible:ring-0 focus-visible:ring-offset-0"
		placeholder="Send a message..."
		onkeydown={(event) => {
			if (event.key === 'Enter' && !event.shiftKey) {
				event.preventDefault()

				customSubmit(event)
			}
		}} />
	{#if attachments.length > 0}
		<div class="flex flex-wrap items-center gap-2 px-4">
			{#each attachments as attachment, index (attachment)}
				<UploadFileCard
					file={attachment.file}
					bind:url={attachment.url}
					bind:status={attachment.status}
					delete={() => {
						attachments = attachments.filter(
							(attachment, attachment_index) =>
								attachment_index !== index,
						)
					}} />
			{/each}
		</div>
	{/if}
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
										{@render modelCapabilitiesIcon(
											model.capabilities,
										)}
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
										{@render modelCapabilitiesIcon(
											model.capabilities,
										)}
									</div>
								</div>
							</DropdownMenu.Item>
						{/each}
					</DropdownMenu.Group>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
			{#if selectedModel.provider === 'google'}
				<Tooltip.Provider>
					<Tooltip.Root>
						<Tooltip.Trigger>
							{#snippet child({ props })}
								<Toggle
									{...props}
									aria-label="toggle grounding"
									bind:pressed={searchGrounding}>
									<SearchIcon />
								</Toggle>
							{/snippet}
						</Tooltip.Trigger>
						<Tooltip.Content>
							<p>Search Grounding</p>
						</Tooltip.Content>
					</Tooltip.Root>
				</Tooltip.Provider>
			{/if}
			<Tooltip.Provider>
				<Tooltip.Root>
					<Tooltip.Trigger>
						<Toggle
							aria-label="toggle search"
							bind:pressed={search}
							disabled={plan === 'free' || plan === undefined}>
							<GlobeIcon />
						</Toggle>
					</Tooltip.Trigger>
					<Tooltip.Content class="max-w-[300px]">
						{#if plan === 'free' || plan === undefined}
							<div class="flex flex-col gap-4 p-2">
								<div class="flex flex-col gap-1">
									<span class="text-lg">
										Upgrade to basic or higher plan
									</span>
									<p class="text-muted-foreground text-wrap text-sm">
										Get access to web search and more by upgrading
										your plan
									</p>
								</div>
								<Button href={'/billing/plan'} class="w-full">
									Checkout plans
								</Button>
							</div>
						{:else}
							<p>Web Search</p>
						{/if}
					</Tooltip.Content>
				</Tooltip.Root>
			</Tooltip.Provider>
			<input
				bind:this={imageInput}
				type="file"
				accept="image/*"
				bind:files={fileInputs}
				multiple={true}
				hidden />
			<Tooltip.Provider>
				<Tooltip.Root>
					<Tooltip.Trigger>
						<Button
							onclick={() => {
								imageInput?.click()
							}}
							variant="ghost"
							size="icon"
							class=""
							disabled={!selectedModel.capabilities.image ||
								plan === 'free' ||
								plan === undefined}>
							<ImageIcon />
						</Button>
					</Tooltip.Trigger>
					<Tooltip.Content class="max-w-[300px]">
						{#if plan === 'free' || plan === undefined}
							<div class="flex flex-col gap-4 p-2">
								<div class="flex flex-col gap-1">
									<span class="text-lg">
										Upgrade to basic or higher plan
									</span>
									<p class="text-muted-foreground text-wrap text-sm">
										Get access to image upload and more by upgrading
										your plan
									</p>
								</div>
								<Button href={'/billing/plan'} class="w-full">
									Checkout plans
								</Button>
							</div>
						{:else}
							<p>Image Upload</p>
						{/if}
					</Tooltip.Content>
				</Tooltip.Root>
			</Tooltip.Provider>
		</div>
		<Button type="submit" class="" size="icon">
			{#if $status === 'submitted' || $status === 'streaming'}
				<Loader2Icon class="animate-spin" />
			{:else}
				<SendIcon />
			{/if}
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

{#snippet modelCapabilitiesIcon(capabilities: {
	fast: boolean
	reasoning: boolean
	searchGrounding: boolean
	image: boolean
})}
	{#if capabilities.searchGrounding}
		<div
			class="flex items-center justify-center rounded bg-green-500/10 p-1 text-green-500 transition-colors hover:bg-green-500/20">
			<SearchIcon />
		</div>
	{/if}
	{#if capabilities.fast}
		<div
			class="flex items-center justify-center rounded bg-yellow-500/10 p-1 text-yellow-500 transition-colors hover:bg-yellow-500/20">
			<ZapIcon />
		</div>
	{/if}
	{#if capabilities.reasoning}
		<div
			class="flex items-center justify-center rounded bg-purple-500/10 p-1 text-purple-500 transition-colors hover:bg-purple-500/20">
			<BrainIcon />
		</div>
	{/if}
	{#if capabilities.image}
		<div
			class="flex items-center justify-center rounded bg-blue-500/10 p-1 text-blue-500 transition-colors hover:bg-blue-500/20">
			<ImageIcon />
		</div>
	{/if}
{/snippet}
