<script lang="ts">
	import { TabulatorFull as Tabulator } from 'tabulator-tables'
	import { onMount } from 'svelte'
	import Chat from './(components)/chat.svelte'
	import { Button } from '$lib/components/ui/button'
	import { useUser } from '../../state.svelte'

	let tableComponent: HTMLElement

	let table: Tabulator
	let fileInput: HTMLInputElement

	onMount(() => {
		table = new Tabulator(tableComponent, {
			reactiveData: true, //enable data reactivity
			spreadsheet: true,
			rowHeader: {
				formatter: 'rownum',
				headerSort: false,
				hozAlign: 'center',
				resizable: false,
				frozen: true,
			},
			// @ts-ignore
			spreadsheetData: [],
			resizableColumnFit: false,
			scrollToRowIfVisible: true, //prevent scrolling to a row if it is visible
			selectableRange: true,
			selectableRangeRows: true,
			spreadsheetColumnDefinition: {
				editor: 'input',
				resizable: 'header',
			}, //add an input editor to every cell
			editTriggerEvent: 'dblclick',
			clipboard: true,
			clipboardCopyRowRange: 'range',
			clipboardPasteParser: 'range',
			clipboardPasteAction: 'range',
			clipboardCopyConfig: {
				rowHeaders: false, //do not include row headers in clipboard output
				columnHeaders: false, //do not include column headers in clipboard output
			},
			clipboardCopyStyled: false,
		})
		table.on('dataLoaded', function (data) {})
	})
</script>

<div
	class="@container flex flex-1 flex-col justify-center overflow-hidden">
	<div class="flex h-16 min-h-16 items-center justify-center gap-4">
		<input
			hidden
			bind:this={fileInput}
			type="file"
			accept="text/csv"
			multiple={false}
			onchange={async (event) => {
				if (!table) return
				// @ts-ignore
				const file = event.target.files[0] as File
				if (!file) return
				const text = await file.text()
				let arrayOfArrays = text
					.split('\n')
					.map((row) => row.split(','))

				table.getSheet('').setData(arrayOfArrays)
			}} />
		<Button
			onclick={() => {
				if (!fileInput) return
				fileInput.click()
			}}>
			Import CSV
		</Button>
		<Button
			onclick={() => {
				if (!table) return
				const data = table.getSheetData('')
				var csvContent = data.map((row) => row.join(',')).join('\n')
				var encodedUri = encodeURI(
					'data:text/csv;charset=utf-8,' + csvContent,
				)
				var link = document.createElement('a')
				link.setAttribute('href', encodedUri)
				link.setAttribute('download', 'data.csv')
				document.body.appendChild(link) // Required for FF
				link.click()
				document.body.removeChild(link) // Required for FF
			}}>
			Export CSV
		</Button>
	</div>
	<div class="@6xl:flex-row flex flex-1 flex-col overflow-hidden">
		<div bind:this={tableComponent} class="flex-1 overflow-scroll">
		</div>
		<div class="relative flex flex-1 overflow-hidden border">
			<Chat plan={useUser().user?.plan} {table} />
		</div>
	</div>
</div>

<svelte:head>
	<link href="/tabulator_site_dark.css" rel="stylesheet" />
</svelte:head>
