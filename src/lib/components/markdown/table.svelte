<script lang="ts">
	import MarkdownInline from './inline.svelte'
	import * as Table from '$lib/components/ui/table/index.js'
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js'
	import { buttonVariants } from '../ui/button'
	import { CopyButton } from '../ui/copy-button'
	import { cn } from '$lib/utils'
	import { DownloadIcon } from '@lucide/svelte'
	import type { Tokens } from 'marked'

	let { token }: { token: Tokens.Table } = $props()

	const downloadCSV = (token: Tokens.Table) => {
		const rows = [
			token.header.map((header) => header.text),
			...token.rows.map((row) => row.map((row) => row.text)),
		]
		let csvContent =
			'data:text/csv;charset=utf-8,' +
			rows.map((e) => e.join(',')).join('\n')

		var encodedUri = encodeURI(csvContent)
		var link = document.createElement('a')
		link.setAttribute('href', encodedUri)
		link.setAttribute('download', 'download.csv')
		document.body.appendChild(link) // Required for FF

		link.click()
	}
</script>

<div class="overflow-hidden rounded-xl border">
	<Table.Root class="!my-0" containerClass="max-h-[50vh]">
		<Table.Header>
			<Table.Row>
				{#each token.header as header, headerIdx}
					<Table.Head
						class={cn(
							'bg-secondary sticky top-0 py-5 font-semibold',
							headerIdx === 0 && 'pl-4',
							headerIdx === token.header.length - 1 && 'pr-4',
						)}>
						<MarkdownInline tokens={header.tokens} />
					</Table.Head>
				{/each}
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each token.rows as row, rowIdx}
				<Table.Row>
					{#each row ?? [] as cell, cellIdx}
						<Table.Cell
							class={cn(
								cellIdx === 0 && 'pl-4',
								cellIdx === row.length - 1 && 'pr-4',
							)}>
							<MarkdownInline tokens={cell.tokens} />
						</Table.Cell>
					{/each}
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
	<div class="bg-secondary flex items-center justify-between px-2">
		<div></div>

		<div class="flex items-center">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger
					class={cn(
						buttonVariants({
							variant: 'ghost',
							class: 'hover:bg-transparent',
							size: 'icon',
						}),
					)}>
					<DownloadIcon />
				</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<DropdownMenu.Group>
						<DropdownMenu.Item onclick={() => downloadCSV(token)}>
							CSV
						</DropdownMenu.Item>
						<!-- <DropdownMenu.Item
									onclick={() => downloadMermaidDiagram('dark')}>
								</DropdownMenu.Item> -->
					</DropdownMenu.Group>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
			<CopyButton
				variant="ghost"
				class="hover:bg-transparent"
				text={token.raw} />
		</div>
	</div>
</div>
