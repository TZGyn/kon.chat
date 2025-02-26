<script lang="ts">
	import { useChat, type Message } from '@ai-sdk/svelte'
	import { cn } from '$lib/utils'
	import { onMount } from 'svelte'
	import { Button, buttonVariants } from '$lib/components/ui/button'
	import { Textarea } from '$lib/components/ui/textarea/index.js'
	import {
		BrainIcon,
		ChevronDownIcon,
		GlobeIcon,
		ImageIcon,
		Loader2Icon,
		SearchIcon,
		SendIcon,
		ZapIcon,
	} from 'lucide-svelte'
	import { toast } from 'svelte-sonner'
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js'
	import * as Tooltip from '$lib/components/ui/tooltip'
	import { PUBLIC_API_URL } from '$env/static/public'

	import { useChats, useUser } from '../../../state.svelte.js'
	import { Toggle } from '$lib/components/ui/toggle/index.js'
	import 'katex/dist/katex.css'
	import * as Avatar from '$lib/components/ui/avatar/index.js'
	import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte'
	import GoogleIcon from './google-icon.svelte'
	import OpenaiIcon from './openai-icon.svelte'
	import GroqIcon from './groq-icon.svelte'
	import AnthropicIcon from './anthropic-icon.svelte'
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import UploadFileCard from './upload-file-card.svelte'
	import { useModels } from '$lib/models.svelte.js'
	import MessageBlock from '$lib/components/message-block.svelte'

	export let chat_id
	export let initialMessages: Array<Message>
	export let plan: 'free' | 'basic' | 'pro' | 'owner' | undefined

	let standardModels = useModels().standardModels
	let premiumModels = useModels().premiumModels

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

	let selectedModel = JSON.parse(
		localStorage.getItem(`model:chat:${chat_id}`) ||
			JSON.stringify({
				name: 'Gemini 2.0 Flash',
				provider: 'google',
				id: 'gemini-2.0-flash-001',
				capabilities: {
					image: true,
					fast: false,
					reasoning: false,
					searchGrounding: true,
				},
			}),
	)
	$: localStorage.setItem(
		`model:chat:${chat_id}`,
		JSON.stringify(selectedModel),
	)
	let search = false
	let searchGrounding = false

	function customSubmit(event: Event) {
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
