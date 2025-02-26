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
		GlobeIcon,
		ImageIcon,
		Loader2Icon,
		SearchIcon,
		SendIcon,
		ZapIcon,
	} from 'lucide-svelte'
	import { cn } from '$lib/utils'
	import { Button, buttonVariants } from '$lib/components/ui/button'
	import { Textarea } from '$lib/components/ui/textarea'
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
	import * as Tooltip from '$lib/components/ui/tooltip'
	import GoogleIcon from '$lib/icons/google-icon.svelte'
	import OpenaiIcon from '$lib/icons/openai-icon.svelte'
	import GroqIcon from '$lib/icons/groq-icon.svelte'
	import AnthropicIcon from '$lib/icons/anthropic-icon.svelte'
	import type { Tabulator } from 'tabulator-tables'
	import MessageBlock from '$lib/components/message-block.svelte'
	import { useModels } from '$lib/models.svelte'

	export let plan: 'free' | 'basic' | 'pro' | 'owner' | undefined
	export let table: Tabulator | undefined

	let scrollElement: HTMLDivElement | null = null
	let inputElement: HTMLTextAreaElement | null = null

	let standardModels = useModels().standardModels
	let premiumModels = useModels().premiumModels

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
						table.getSheet('').setRows(row + 10)
						table.setSheetData('', data)
					}
					const spreadSheetRow = table.getRows()[row]

					if (spreadSheetRow.getCells().length <= column + 1) {
						const data = table.getSheetData('')
						table.getSheet('').setColumns(column + 1 + 5)
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
					table.getSheet('').setRows(row + 10)
					table.setSheetData('', data)
				}
				const spreadSheetRow = table.getRows()[row]

				if (spreadSheetRow.getCells().length <= column + 1) {
					const data = table.getSheetData('')
					table.getSheet('').setColumns(column + 1 + 5)
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
						table.getSheet('').setRows(row + 10)
						table.setSheetData('', data)
					}
					const spreadSheetRow = table.getRows()[row]

					if (spreadSheetRow.getCells().length <= column + 1) {
						const data = table.getSheetData('')
						table.getSheet('').setColumns(column + 1 + 5)
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
	<div class="flex w-full flex-col items-center pb-40">
		<div class="flex w-full max-w-[600px] flex-col gap-4">
			{#each $messages as message, index}
				<MessageBlock
					annotations={message.annotations}
					data={$data}
					{message}
					role={message.role}
					status={$status}
					isLast={index === $messages.length - 1}
					halfSize={true} />
			{/each}
			{#if $status === 'submitted'}
				<div
					class={cn(
						'@6xl:min-h-[calc(100svh-25rem)] flex min-h-[calc(50svh-25rem)] gap-2 place-self-start',
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
