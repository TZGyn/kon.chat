<script lang="ts">
	import { Textarea } from '$lib/components/ui/textarea/index.js'
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js'
	import * as Tooltip from '$lib/components/ui/tooltip'
	import { Toggle } from '$lib/components/ui/toggle/index.js'
	import { useModels, type Model } from '$lib/states/models.svelte.js'
	import UploadFileCard from '$lib/components/upload-file-card.svelte'
	import { Button, buttonVariants } from '$lib/components/ui/button'
	import * as Popover from '$lib/components/ui/popover/index.js'

	import * as Select from '$lib/components/ui/select/index.js'
	import {
		ArrowDownIcon,
		BookIcon,
		BrainIcon,
		ChevronDownIcon,
		CodeXmlIcon,
		FileTextIcon,
		Globe,
		GlobeIcon,
		ImageIcon,
		ImagesIcon,
		LibraryBigIcon,
		Loader2Icon,
		MemoryStick,
		MessageCircleIcon,
		PaperclipIcon,
		SearchIcon,
		SendIcon,
		SquareIcon,
		ZapIcon,
	} from 'lucide-svelte'
	import GoogleIcon from '$lib/icons/google-icon.svelte'
	import OpenaiIcon from '$lib/icons/openai-icon.svelte'
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
	import TwitterLogo from '$lib/icons/twitter-logo.svelte'
	import MistralIcon from '$lib/icons/mistral-icon.svelte'
	import OpenRouterIcon from '$lib/icons/open-router-icon.svelte'
	import { Input } from './ui/input'
	import * as m from '$lib/paraglide/messages'
	import { cn } from '$lib/utils'
	import { Brain, WandSparklesIcon } from '@lucide/svelte'
	import Drawing from './input/drawing.svelte'
	import { useSettings } from '$lib/states/settings.svelte'
	import { useCapabilities } from '$lib/states/capabilities.svelte'
	import Suggestions from './input/suggestions.svelte'

	let {
		input = $bindable(),
		selectedModelLocator,
		messages = $bindable(),
		data = $bindable(),
		handleSubmit,
		customData,
		imageUpload = false,
		fileUpload = false,
		enableSearch = false,
		autoScroll,
		upload_url,
	}: {
		input: string
		selectedModelLocator: string
		messages: UIMessage[]
		data: JSONValue[] | undefined
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
		upload_url?: string
	} = $props()

	let modelState = useModels()

	const settings = useSettings()
	const capabilities = useCapabilities()

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

		attachments.push(...attachments, ...items)
		attachments = attachments
	})

	let selectedModel = $state<Model>({
		name: 'GPT 4.1',
		info: '',
		provider: 'openai',
		id: 'gpt-4.1',
		capabilities: {
			image: true,
			file: false,
			fast: false,
			reasoning: false,
			searchGrounding: false,
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

		data = []
		handleSubmit(event, {
			body: {
				provider: {
					name: selectedModel.provider,
					model: selectedModel.id,
					reasoning_effort:
						selectedModel.id === 'o3-mini' ||
						selectedModel.id === 'o4-mini'
							? reasoningEffort
							: undefined,
					thinking_budget:
						selectedModel.id === 'gemini-2.5-flash-preview-04-17'
							? thinkingBudget
							: undefined,
					api_key: settings.getProviderAPIKey(selectedModel.provider),
					exa_api_key: settings.getProviderAPIKey('exa'),
				},
				...custom,
				search,
				searchGrounding,
				name_for_llm: settings.settings.nameForLLM || '',
				additional_system_prompt:
					settings.settings.additionalSystemPrompt || '',
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

	const adjustInputHeight = () => {
		if (inputElement) {
			inputElement.style.height = 'auto'
			inputElement.style.height = `${inputElement.scrollHeight + 2}px`
		}
	}

	$effect(() => {
		input
		adjustInputHeight()
	})

	let modelSearch = $state('')

	let modelsList = $derived([
		{
			name: 'Models',
			models: modelState.models.filter(
				(model) =>
					model.name
						.toLowerCase()
						.includes(modelSearch.toLowerCase()) ||
					model.provider
						.toLowerCase()
						.includes(modelSearch.toLowerCase()),
			),
		},
		{
			name: 'Custom Models',
			models: modelState.customModels.filter(
				(model) =>
					model.name
						.toLowerCase()
						.includes(modelSearch.toLowerCase()) ||
					model.provider
						.toLowerCase()
						.includes(modelSearch.toLowerCase()),
			),
		},
	])

	let reasoningEffort = $state<'low' | 'medium' | 'high'>('low')

	let thinkingBudget = $state(0)

	let modelSelectPopoverOpen = $state(false)

	let openSuggestions = $state(false)
</script>

<form
	onsubmit={customSubmit}
	class="bg-popover absolute right-1/2 bottom-0 flex h-auto w-full max-w-[700px] translate-x-1/2 flex-col gap-2 rounded-xl rounded-b-none p-3">
	<div
		class="absolute right-1/2 bottom-[calc(100%+0.5rem)] flex w-full translate-x-1/2 flex-col items-center gap-2">
		{#if !autoScroll?.isAtBottom}
			<Button
				class="bg-input/70 hover:bg-input dark:bg-input/70 dark:hover:bg-input"
				variant="outline"
				size="icon"
				onclick={() => autoScroll?.scrollToBottom()}>
				<ArrowDownIcon />
			</Button>
		{/if}

		{#if openSuggestions}
			<Suggestions
				updatePrompt={(value) => {
					input = value
					openSuggestions = false
				}} />
		{/if}
	</div>
	<Textarea
		bind:value={input}
		bind:ref={inputElement}
		onpaste={(event) => {
			const files = Array.from(event.clipboardData?.files ?? [])
			const images = files.filter((file) =>
				file.type.includes('image'),
			)
			if (images.length > 0) {
				event.preventDefault()
				attachments.push(
					...images.map((image) => ({
						file: image,
						url: '',
						status: 'submitted' as const,
					})),
				)

				return
			}
		}}
		class="bg-popover dark:bg-popover max-h-96 min-h-4 resize-none border-none px-4 pt-2 pb-0 focus-visible:ring-0 focus-visible:ring-offset-0"
		placeholder={m.send_a_message() + ' ' + m.ctrl_enter_to_send()}
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
					{upload_url}
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
			<Popover.Root bind:open={modelSelectPopoverOpen}>
				<Popover.Trigger
					class={buttonVariants({ variant: 'outline' })}>
					{@render modelIcon(selectedModel.provider)}
					{selectedModel.name}
					<ChevronDownIcon />
				</Popover.Trigger>
				<Popover.Content
					class="bg-background @container w-[100vw] max-w-[600px] p-0"
					align="start">
					<div
						class="h-full max-h-[70vh] space-y-4 overflow-y-scroll p-4">
						{#each modelsList.filter((list) => list.models.length > 0) as modelGroup}
							<div>
								<div
									class="text-muted-foreground px-0 py-1.5 text-sm font-semibold">
									{modelGroup.name}
								</div>
								<div
									class="grid grid-cols-1 gap-2 @md:grid-cols-2 @lg:grid-cols-3">
									{#each modelGroup.models as model}
										<!-- svelte-ignore a11y_click_events_have_key_events -->
										<!-- svelte-ignore a11y_no_static_element_interactions -->
										<div
											class={cn(
												'bg-popover hover:bg-accent flex flex-col flex-wrap gap-2 rounded p-3 text-sm [&_svg:not([class*="size-"])]:size-4',
												model.id === selectedModel.id && 'bg-accent',
											)}
											onclick={() => {
												selectedModel = model
												modelSelectPopoverOpen = false
											}}>
											<div class="flex w-full items-center gap-2">
												{@render modelIcon(model.provider)}
												<span>
													{model.name}
												</span>
											</div>
											<div
												class="flex w-full items-center justify-between">
												<div class="flex items-center gap-2">
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
											</div>

											<div class="flex w-full items-center gap-2">
												{@render modelCapabilitiesIcon(
													model.capabilities,
												)}
												<div class="flex w-0 overflow-hidden py-1">
													<SearchIcon class="w-0 max-w-0" />
												</div>
											</div>
										</div>
									{/each}
								</div>
							</div>
						{/each}
					</div>
					<div class="flex w-full border-t p-4">
						<Input
							bind:value={modelSearch}
							placeholder="search..."
							class="bg-background rounded" />
					</div>
				</Popover.Content>
			</Popover.Root>
			{#if 'thinkingBudget' in selectedModel.capabilities && selectedModel.capabilities.thinkingBudget?.enable}
				<Popover.Root>
					<Popover.Trigger
						class={cn(
							buttonVariants({ variant: 'ghost' }),
							'h-10 w-10',
						)}>
						<Brain />
					</Popover.Trigger>
					<Popover.Content>
						<div class="flex items-center gap-2">
							<span>Thinking Budget</span>
							<div
								class="bg-secondary w-fit min-w-12 rounded px-3 py-1 text-center">
								{thinkingBudget}
							</div>
						</div>
						<Input
							bind:value={thinkingBudget}
							type="range"
							min={selectedModel.capabilities.thinkingBudget.min}
							max={selectedModel.capabilities.thinkingBudget.max}
							step={1}
							class="accent-primary" />
					</Popover.Content>
				</Popover.Root>
			{/if}
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
			{#if selectedModel.id === 'o3-mini' || selectedModel.id === 'o4-mini'}
				<Tooltip.Provider>
					<Tooltip.Root>
						<Tooltip.Trigger>
							{#snippet child({ props })}
								<Select.Root
									type="single"
									bind:value={reasoningEffort}>
									<Select.Trigger class="w-[100px]" {...props}>
										{reasoningEffort}
									</Select.Trigger>
									<Select.Content>
										<Select.Group>
											<Select.Label>Reasoning Effort</Select.Label>
											<Select.Item value="low">Low</Select.Item>
											<Select.Item value="medium">Medium</Select.Item>
											<Select.Item value="high">High</Select.Item>
										</Select.Group>
									</Select.Content>
								</Select.Root>
							{/snippet}
						</Tooltip.Trigger>
						<Tooltip.Content>
							<p>Search Grounding</p>
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
								disabled={!selectedModel.capabilities.image}>
								<ImageIcon />
							</Button>
						</Tooltip.Trigger>
						<Tooltip.Content class="max-w-[300px]">
							<p>Image Upload</p>
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
								disabled={!selectedModel.capabilities.file}>
								<PaperclipIcon />
							</Button>
						</Tooltip.Trigger>
						<Tooltip.Content class="max-w-[300px]">
							<p>File Upload</p>
						</Tooltip.Content>
					</Tooltip.Root>
				</Tooltip.Provider>
			{/if}
			<SpeechToText bind:input />

			{#if imageUpload && selectedModel.capabilities.image}
				<Drawing
					addDrawing={(drawing: File) => {
						attachments.push({
							file: drawing,
							url: '',
							status: 'submitted',
						})
						attachments = attachments
					}}
					disabled={!selectedModel.capabilities.image} />
			{/if}
		</div>
		<div class="flex items-center gap-2">
			<Toggle
				bind:pressed={openSuggestions}
				aria-label="toggle suggestion">
				<WandSparklesIcon class="size-4" />
			</Toggle>
			<Button type="submit" size="icon">
				<SendIcon />
			</Button>
		</div>
	</div>
</form>

{#snippet modelIcon(provider: string)}
	{#if provider === 'google'}
		<GoogleIcon />
	{:else if provider === 'openai'}
		<OpenaiIcon />
	{:else if provider === 'anthropic'}
		<AnthropicIcon />
	{:else if provider === 'xai'}
		<XaiIcon />
	{:else if provider === 'mistral'}
		<MistralIcon />
	{:else if provider === 'open_router'}
		<OpenRouterIcon />
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
			<SearchIcon class="text-green-500" />
		</div>
	{/if}
	{#if capabilities.fast}
		<div
			class="flex items-center justify-center rounded bg-yellow-500/10 p-1 text-yellow-500 transition-colors hover:bg-yellow-500/20">
			<ZapIcon class="text-yellow-500" />
		</div>
	{/if}
	{#if capabilities.reasoning}
		<div
			class="flex items-center justify-center rounded bg-purple-500/10 p-1 text-purple-500 transition-colors hover:bg-purple-500/20">
			<BrainIcon class="text-purple-500" />
		</div>
	{/if}
	{#if capabilities.image}
		<div
			class="flex items-center justify-center rounded bg-blue-500/10 p-1 text-blue-500 transition-colors hover:bg-blue-500/20">
			<ImageIcon class="text-blue-500" />
		</div>
	{/if}
	{#if capabilities.file}
		<div
			class="flex items-center justify-center rounded bg-cyan-500/10 p-1 text-cyan-500 transition-colors hover:bg-cyan-500/20">
			<FileTextIcon class="text-cyan-500" />
		</div>
	{/if}
{/snippet}
