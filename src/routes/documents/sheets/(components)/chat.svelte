<script lang="ts">
	import { PUBLIC_API_URL } from '$env/static/public'
	import { useChat } from '@ai-sdk/svelte'
	import { useUser } from '../../../state.svelte'
	import { onMount } from 'svelte'
	import { toast } from 'svelte-sonner'
	import { ScrollArea } from '$lib/components/ui/scroll-area'
	import * as Avatar from '$lib/components/ui/avatar'
	import { cn } from '$lib/utils'
	import type { Tabulator } from 'tabulator-tables'
	import MessageBlock from '$lib/components/message-block.svelte'
	import MultiModalInput from '$lib/components/multi-modal-input.svelte'
	import { UseAutoScroll } from '$lib/hooks/use-auto-scroll.svelte'
	import { Loader2Icon } from 'lucide-svelte'

	let { table }: { table: Tabulator | undefined } = $props()

	const autoScroll = new UseAutoScroll()

	const getCustomData = () => {
		if (!table) return
		return {
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
		stop,
	} = useChat({
		maxSteps: 1,
		initialMessages: [],
		api: PUBLIC_API_URL + `/documents/sheets`,
		onFinish: () => {
			autoScroll.scrollToBottom()
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
</script>

<ScrollArea
	bind:vp={autoScroll.ref}
	class="flex flex-1 flex-col items-center p-4">
	<div class="flex w-full flex-col items-center pb-40">
		<div class="flex w-full max-w-[600px] flex-col gap-4">
			{#each $messages as message, index}
				<MessageBlock
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
							<div class="flex animate-pulse items-center gap-2">
								<Loader2Icon class="size-4 animate-spin" />
								Submitting Prompt
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</ScrollArea>
<MultiModalInput
	bind:input={$input}
	selectedModelLocator={`model:sheets`}
	{handleSubmit}
	messages={$messages}
	{setData}
	{setMessages}
	status={$status}
	customData={getCustomData}
	{autoScroll}
	{stop} />
