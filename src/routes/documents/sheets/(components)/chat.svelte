<script lang="ts">
	import { PUBLIC_API_URL } from '$env/static/public'
	import { useChat } from '@ai-sdk/svelte'
	import { useUser } from '../../../state.svelte'
	import { onMount } from 'svelte'
	import { toast } from 'svelte-sonner'
	import { ScrollArea } from '$lib/components/ui/scroll-area'
	import * as Avatar from '$lib/components/ui/avatar'
	import { Toggle } from '$lib/components/ui/toggle'
	import {
		BrainIcon,
		ChevronDownIcon,
		CopyIcon,
		GlobeIcon,
		ImageIcon,
		Loader2Icon,
		SearchIcon,
		SendIcon,
		ZapIcon,
	} from 'lucide-svelte'
	import { cn } from '$lib/utils'
	import { Carta, Markdown } from 'carta-md'
	import DOMPurify from 'isomorphic-dompurify'
	import { math } from '@cartamd/plugin-math'
	import { code } from '@cartamd/plugin-code'
	import { Button, buttonVariants } from '$lib/components/ui/button'
	import { copy } from '$lib/clipboard'
	import { Textarea } from '$lib/components/ui/textarea'
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
	import * as Tooltip from '$lib/components/ui/tooltip'
	import GoogleIcon from '$lib/icons/google-icon.svelte'
	import OpenaiIcon from '$lib/icons/openai-icon.svelte'
	import GroqIcon from '$lib/icons/groq-icon.svelte'
	import AnthropicIcon from '$lib/icons/anthropic-icon.svelte'
	import type { Tabulator } from 'tabulator-tables'

	export let plan: 'free' | 'basic' | 'pro' | 'owner' | undefined
	export let table: Tabulator | undefined

	let scrollElement: HTMLDivElement | null = null
	let inputElement: HTMLTextAreaElement | null = null

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
		if (!table) return
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
					spreadSheetData: table.getSheetData('') || [],
					selectedSheetData: table.getRanges().map((range) => {
						return {
							topLeftRow: range.getTopEdge(),
							topLeftColumn: range.getLeftEdge(),
							bottomRightRow: range.getBottomEdge(),
							bottomRightColumn: range.getRightEdge(),
							data: range.getData(),
						}
					}),
					search,
					searchGrounding,
				},
			})
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
		initialMessages: [],
		api: PUBLIC_API_URL + `/documents/sheets`,
		onFinish: () => {
			scrollToBottom()
			useUser().getUser()
		},
		onError: (error) => {
			console.log(error)
			toast.error(error.message)
		},
		onToolCall({ toolCall }) {
			if (!table) return

			table.getRanges().map((range) => range.remove())
			console.log(toolCall)
			if (toolCall.toolName === 'getCellValue') {
				const { row, column } = toolCall.args as {
					row: number
					column: number
				}
				const topLeft = table.getRows()[row].getCells()[column + 1]
				const bottomRight = table.getRows()[row].getCells()[
					column + 1
				]
				table.addRange(topLeft, bottomRight)
				table.scrollToRow(topLeft.getRow(), 'center')
				table.scrollToColumn(topLeft.getColumn(), 'center')
				// table.getRanges()[0].remove()
			}
			if (toolCall.toolName === 'getRangeValues') {
				const { rowStart, columnEnd, columnStart, rowEnd } =
					toolCall.args as {
						rowStart: number
						columnStart: number
						rowEnd: number
						columnEnd: number
					}
				const topLeft = table.getRows()[rowStart].getCells()[
					columnStart + 1
				]
				const bottomRight = table.getRows()[rowEnd].getCells()[
					columnEnd + 1
				]
				table.addRange(topLeft, bottomRight)
				table.scrollToRow(topLeft.getRow(), 'center')
				table.scrollToColumn(topLeft.getColumn(), 'center')
			}
			if (toolCall.toolName === 'setSheetCellRange') {
				const { data: setSheetData } = toolCall.args as {
					data: {
						row: number
						column: number
						data: string
					}[]
				}
				let minRow: number = Number.MAX_VALUE
				let minCol: number = Number.MAX_VALUE
				let maxRow: number = Number.MIN_VALUE
				let maxCol: number = Number.MIN_VALUE
				setSheetData.map((sheetData, index) => {
					if (index === 0) {
						minRow = sheetData.row
						minCol = sheetData.column
					}
					if (sheetData.row <= minRow) {
						minRow = sheetData.row
					}
					if (sheetData.column <= minCol) {
						minCol = sheetData.column
					}
					if (sheetData.row >= minRow) {
						maxRow = sheetData.row
					}
					if (sheetData.column >= minCol) {
						maxCol = sheetData.column
					}
					const { row, column, data } = sheetData
					if (table.getRows().length <= row) {
						const data = table.getSheetData('')
						table.getSheet('').setColumns(row)
						table.setSheetData('', data)
					}
					const spreadSheetRow = table.getRows()[row]

					if (spreadSheetRow.getCells().length <= column) {
						const data = table.getSheetData('')
						table.getSheet('').setColumns(column)
						table.setSheetData('', data)
					}

					const cell = spreadSheetRow.getCells()[column + 1]

					cell.setValue(data)
				})

				const topLeft = table.getRows()[minRow].getCells()[minCol + 1]
				const bottomRight = table.getRows()[maxRow].getCells()[
					maxCol + 1
				]
				table.addRange(topLeft, bottomRight)
				table.scrollToRow(topLeft.getRow(), 'center')
				table.scrollToColumn(topLeft.getColumn(), 'center')
			}
			if (toolCall.toolName === 'setSheetCell') {
				const { column, data, row } = toolCall.args as {
					row: number
					column: number
					data: string
				}
				if (table.getRows().length <= row) {
					const data = table.getSheetData('')
					table.getSheet('').setRows(row)
					table.setSheetData('', data)
				}
				const spreadSheetRow = table.getRows()[row]

				if (spreadSheetRow.getCells().length <= column) {
					const data = table.getSheetData('')
					table.getSheet('').setColumns(column)
					table.setSheetData('', data)
				}
				const cell = spreadSheetRow.getCells()[column + 1]
				cell.setValue(data)

				const topLeft = table.getRows()[row].getCells()[column + 1]
				const bottomRight = table.getRows()[row].getCells()[
					column + 1
				]
				table.addRange(topLeft, bottomRight)
				table.scrollToRow(topLeft.getRow(), 'center')
				table.scrollToColumn(topLeft.getColumn(), 'center')
			}
			if (toolCall.toolName === 'unsetSheetRange') {
				const { data: unset } = toolCall.args as {
					data: {
						row: number
						column: number
					}[]
				}

				unset.map((sheetData, index) => {
					const { row, column } = sheetData
					if (table.getRows().length <= row) {
						const data = table.getSheetData('')
						table.getSheet('').setColumns(row)
						table.setSheetData('', data)
					}
					const spreadSheetRow = table.getRows()[row]

					if (spreadSheetRow.getCells().length <= column) {
						const data = table.getSheetData('')
						table.getSheet('').setColumns(column)
						table.setSheetData('', data)
					}

					const cell = spreadSheetRow.getCells()[column + 1]

					cell.setValue(null)
				})
			}
			if (toolCall.toolName === 'deleteRows') {
				const { data: deleteRows } = toolCall.args as {
					data: number[]
				}
				deleteRows.map((row) => {
					const data = table.getSheetData('')
					data.splice(row, 1)
					table.setSheetData('', data)
				})
			}
			if (toolCall.toolName === 'deleteColumns') {
				const { data: deleteColumns } = toolCall.args as {
					data: number[]
				}
				deleteColumns.map((column) => {
					const data = table.getSheetData('')
					const filtered = data.map((v) =>
						v.filter((_, i) => i !== column),
					)
					table.setSheetData('', filtered)
				})
			}
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
	]
</script>

<ScrollArea
	bind:vp={scrollElement}
	class="flex flex-1 flex-col items-center p-4">
	<div class="flex w-full flex-col items-center pb-40">
		<div class="flex w-full max-w-[600px] flex-col gap-4">
			{#each $messages as message, index}
				<div
					class={cn(
						'flex gap-2',
						message.role === 'user'
							? 'place-self-end'
							: 'place-self-start',
						// index === $messages.length - 1 &&
						// 	$status !== 'submitted' &&
						// 	'min-h-[calc(100svh-25rem)]',
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
