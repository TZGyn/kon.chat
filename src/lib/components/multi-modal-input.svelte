<script lang="ts">
	import { Textarea } from '$lib/components/ui/textarea/index.js'
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js'
	import * as Tooltip from '$lib/components/ui/tooltip'
	import { Toggle } from '$lib/components/ui/toggle/index.js'
	import { useModels } from '$lib/models.svelte.js'
	import UploadFileCard from '$lib/components/upload-file-card.svelte'
	import { Button, buttonVariants } from '$lib/components/ui/button'
	import {
		ArrowDownIcon,
		BrainIcon,
		ChevronDownIcon,
		FileTextIcon,
		GlobeIcon,
		ImageIcon,
		Loader2Icon,
		PaperclipIcon,
		SearchIcon,
		SendIcon,
		ZapIcon,
	} from 'lucide-svelte'
	import { useUser } from '../../routes/state.svelte'
	import GoogleIcon from '$lib/icons/google-icon.svelte'
	import OpenaiIcon from '$lib/icons/openai-icon.svelte'
	import GroqIcon from '$lib/icons/groq-icon.svelte'
	import AnthropicIcon from '$lib/icons/anthropic-icon.svelte'
	import { toast } from 'svelte-sonner'
	import type { ChatRequestOptions } from 'ai'
	import type {
		JSONValue,
		Message,
		UIMessage,
	} from '@ai-sdk/ui-utils'
	import { browser } from '$app/environment'
	import SpeechToText from './speech-to-text.svelte'
	import XaiIcon from '$lib/icons/xai-icon.svelte'
	import type { UseAutoScroll } from '$lib/hooks/use-auto-scroll.svelte'

	let {
		input = $bindable(),
		selectedModelLocator,
		status,
		messages,
		setMessages,
		setData,
		handleSubmit,
		customData,
		imageUpload = false,
		fileUpload = false,
		enableSearch = false,
		autoScroll,
	}: {
		input: string
		selectedModelLocator: string
		status: 'submitted' | 'streaming' | 'ready' | 'error'
		messages: UIMessage[]
		setMessages: (
			messages: Message[] | ((messages: Message[]) => Message[]),
		) => void
		setData: (
			data:
				| JSONValue[]
				| undefined
				| ((
						data: JSONValue[] | undefined,
				  ) => JSONValue[] | undefined),
		) => void
		handleSubmit: (
			event?: {
				preventDefault?: () => void
			},
			chatRequestOptions?: ChatRequestOptions,
		) => void
		customData?: () => any
		imageUpload?: boolean
		fileUpload?: boolean
		enableSearch?: boolean
		autoScroll?: UseAutoScroll
	} = $props()

	let modelState = useModels()

	let userState = useUser()
	let plan = $derived(userState.user?.plan)

	let inputElement: HTMLTextAreaElement | null = $state(null)

	let imageInput: HTMLInputElement | null = $state(null)
	let imageInputs: FileList | undefined = $state()

	let fileInput: HTMLInputElement | null = $state(null)
	let fileInputs: FileList | undefined = $state()

	let attachments: {
		file: File
		url?: string
		status: 'submitted' | 'uploading' | 'error' | 'ready'
	}[] = $state([
		// {
		// 	contentType: 'image/png',
		// 	url: 'https://pub-ebd1464da2b7495383cfdcb47dd2acd9.r2.dev/ok.png',
		// },
	])

	$effect(() => {
		if (!imageInputs) return

		const items = Array.from(imageInputs).map((file) => ({
			file: file,
			url: '',
			status: 'submitted' as const,
		}))

		imageInputs = undefined

		attachments.push(...items)
		attachments = attachments
	})

	$effect(() => {
		if (!fileInputs) return

		const items = Array.from(fileInputs).map((file) => ({
			file: file,
			url: '',
			status: 'submitted' as const,
		}))

		fileInputs = undefined

		attachments.push(...items)
		attachments = attachments
	})

	let selectedModel = $state({
		name: 'Gemini 2.0 Flash',
		provider: 'google',
		id: 'gemini-2.0-flash-001',
		capabilities: {
			image: true,
			file: false,
			fast: false,
			reasoning: false,
			searchGrounding: true,
		},
	})

	$effect(() => {
		if (!browser) return
		if (!localStorage.getItem(selectedModelLocator)) return
		selectedModel = JSON.parse(
			localStorage.getItem(selectedModelLocator)!,
		)
	})

	$effect(() => {
		localStorage.setItem(
			selectedModelLocator,
			JSON.stringify(selectedModel),
		)
	})

	let search = $state(false)
	let searchGrounding = $state(false)

	function customSubmit(event: Event) {
		let custom = undefined
		if (customData) {
			custom = customData()
		}
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

		if (status === 'error') {
			setMessages(messages.slice(0, -1)) // remove last message
		}
		if (status === 'streaming') {
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
					...custom,
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

	const adjustInputHeight = () => {
		if (inputElement) {
			inputElement.style.height = 'auto'
			inputElement.style.height = `${inputElement.scrollHeight + 2}px`
		}
	}

	$effect(() => {
		input && adjustInputHeight()
	})
</script>

<form
	onsubmit={customSubmit}
	class="bg-secondary absolute bottom-0 right-1/2 flex h-auto w-full max-w-[700px] translate-x-1/2 flex-col gap-2 rounded-xl rounded-b-none p-3">
	{#if !autoScroll?.isAtBottom}
		<Button
			class="absolute -top-12 right-1/2 translate-x-1/2"
			variant="outline"
			onclick={() => autoScroll?.scrollToBottom()}>
			<ArrowDownIcon />
			Scroll To Bottom
		</Button>
	{/if}
	<Textarea
		bind:value={input}
		bind:ref={inputElement}
		class="max-h-96 min-h-4 resize-none border-none bg-transparent px-4 pb-0 pt-2 focus-visible:ring-0 focus-visible:ring-offset-0"
		placeholder="Send a message..."
		onkeydown={(event) => {
			if (event.key === 'Enter' && event.ctrlKey) {
				event.preventDefault()

				customSubmit(event)
			}
		}} />
	{#if attachments.length > 0}
		<div class="flex flex-wrap items-center gap-2">
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
		<div class="flex items-center gap-1">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger
					class={buttonVariants({ variant: 'outline' })}>
					{@render modelIcon(selectedModel.provider)}
					{selectedModel.name}
					<ChevronDownIcon />
				</DropdownMenu.Trigger>
				<DropdownMenu.Content
					class="w-[400px] min-w-[8rem]"
					align="start">
					<DropdownMenu.Group>
						<DropdownMenu.GroupHeading class="text-muted-foreground">
							Free Models
						</DropdownMenu.GroupHeading>
						{#each modelState.freeModels as model}
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
					<DropdownMenu.Group>
						<DropdownMenu.GroupHeading class="text-muted-foreground">
							Standard Models
						</DropdownMenu.GroupHeading>
						{#each modelState.standardModels as model}
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
					<DropdownMenu.Group>
						<DropdownMenu.GroupHeading class="text-muted-foreground">
							Premium Models
						</DropdownMenu.GroupHeading>
						{#each modelState.premiumModels as model}
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
			{#if enableSearch}
				<Tooltip.Provider>
					<Tooltip.Root>
						<Tooltip.Trigger>
							<Toggle
								aria-label="toggle search"
								bind:pressed={search}
								disabled={plan === 'free' ||
									plan === 'trial' ||
									plan === undefined}>
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
										<p
											class="text-muted-foreground text-wrap text-sm">
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
			{/if}
			{#if imageUpload && selectedModel.capabilities.image}
				<input
					bind:this={imageInput}
					type="file"
					accept="image/*"
					bind:files={imageInputs}
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
									plan === 'trial' ||
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
										<p
											class="text-muted-foreground text-wrap text-sm">
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
			{/if}
			{#if fileUpload && selectedModel.capabilities.file}
				<input
					bind:this={fileInput}
					type="file"
					accept="application/pdf"
					bind:files={fileInputs}
					multiple={true}
					hidden />

				<Tooltip.Provider>
					<Tooltip.Root>
						<Tooltip.Trigger>
							<Button
								onclick={() => {
									fileInput?.click()
								}}
								variant="ghost"
								size="icon"
								class=""
								disabled={!selectedModel.capabilities.file ||
									plan === 'free' ||
									plan === 'trial' ||
									plan === 'basic' ||
									plan === undefined}>
								<PaperclipIcon />
							</Button>
						</Tooltip.Trigger>
						<Tooltip.Content class="max-w-[300px]">
							{#if plan === 'free' || plan === undefined}
								<div class="flex flex-col gap-4 p-2">
									<div class="flex flex-col gap-1">
										<span class="text-lg">
											Upgrade to basic or higher plan
										</span>
										<p
											class="text-muted-foreground text-wrap text-sm">
											Get access to file upload and more by upgrading
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
			{/if}
			<SpeechToText bind:input />
		</div>
		<div class="flex items-center gap-2">
			<Button type="submit" class="" size="icon">
				{#if status === 'submitted' || status === 'streaming'}
					<Loader2Icon class="animate-spin" />
				{:else}
					<SendIcon />
				{/if}
			</Button>
		</div>
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
	{:else if provider === 'xai'}
		<XaiIcon />
	{/if}
{/snippet}

{#snippet modelCapabilitiesIcon(capabilities: {
	fast: boolean
	reasoning: boolean
	searchGrounding: boolean
	image: boolean
	file: boolean
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
	{#if capabilities.file}
		<div
			class="flex items-center justify-center rounded bg-cyan-500/10 p-1 text-cyan-500 transition-colors hover:bg-cyan-500/20">
			<FileTextIcon />
		</div>
	{/if}
{/snippet}
