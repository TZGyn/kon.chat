<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js'
	import * as Accordion from '$lib/components/ui/accordion/index.js'
	import { cn } from '$lib/utils'
	import { CheckIcon, GlobeIcon, SearchIcon } from 'lucide-svelte'

	type QueryCompletion = {
		type: 'query_completion'
		data: {
			query: string
			index: number
			total: number
			status: 'completed'
			resultsCount: number
			imagesCount: number
		}
	}

	let {
		annotations,
		queries,
	}: {
		queries: string[]
		annotations: QueryCompletion[]
	} = $props()
	let completedQueries = $derived(annotations.length)
	let totalResults = $derived(
		annotations.reduce((sum, a) => sum + a.data.resultsCount, 0),
	)
	let totalImages = $derived(
		annotations.reduce((sum, a) => sum + a.data.imagesCount, 0),
	)
</script>

<div class="w-full space-y-4">
	<Accordion.Root value="search" type="single" class="w-full">
		<Accordion.Item value="search" class="border-none">
			<Accordion.Trigger
				class={cn(
					'rounded-xl border border-neutral-200 bg-white p-4 shadow-sm hover:no-underline dark:border-neutral-800 dark:bg-neutral-900',
					'[&[data-state=open]]:rounded-b-none',
				)}>
				<div class="flex w-full items-center justify-between">
					<div class="flex items-center gap-2">
						<div
							class="rounded-lg bg-neutral-100 p-2 dark:bg-neutral-800">
							<GlobeIcon class="h-4 w-4 text-neutral-500" />
						</div>
						<h2 class="text-left font-medium">Sources Found</h2>
					</div>
					<div class="mr-2 flex items-center gap-2">
						<Badge
							variant="secondary"
							class="rounded-full bg-neutral-100 px-3 py-1 dark:bg-neutral-800">
							<SearchIcon class="mr-1.5 h-3 w-3" />
							{totalResults || '0'} Results
						</Badge>
					</div>
				</div>
			</Accordion.Trigger>

			<Accordion.Content
				class="mt-0 max-w-[min(100vw-2rem,600px)] border-0 pt-0">
				<div
					class="rounded-b-xl border border-t-0 border-neutral-200 bg-white px-4 py-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
					<div
						class="no-scrollbar mb-3 flex gap-2 overflow-x-auto pb-1">
						{#each queries as query, i}
							{@const annotation = annotations.find(
								(a) => a.data.query === query,
							)}
							<Badge
								variant="secondary"
								class={cn(
									'flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5',
									annotation
										? 'bg-neutral-100 dark:bg-neutral-800'
										: 'bg-neutral-50 text-neutral-400 dark:bg-neutral-900',
								)}>
								{#if annotation}
									<CheckIcon class="h-3 w-3" />
								{:else}
									<div
										class="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent">
									</div>
								{/if}
								{query}
							</Badge>
						{/each}
					</div>

					<div class="no-scrollbar flex gap-3 overflow-x-auto pb-1">
						{#each [...Array(6)] as _, i}
							<div
								class="bg-background border-border w-[300px] flex-shrink-0 rounded-xl border shadow-sm">
								<div class="p-4">
									<div class="mb-3 flex items-center gap-2.5">
										<div
											class="h-10 w-10 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800">
										</div>
										<div class="flex-1 space-y-2">
											<div
												class="h-4 w-3/4 animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-800">
											</div>
											<div
												class="h-3 w-1/2 animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-800">
											</div>
										</div>
									</div>
									<div class="space-y-2">
										<div
											class="h-3 w-full animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-800">
										</div>
										<div
											class="h-3 w-5/6 animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-800">
										</div>
										<div
											class="h-3 w-4/6 animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-800">
										</div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</Accordion.Content>
		</Accordion.Item>
	</Accordion.Root>

	<div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
		{#each [...Array(5)] as _, i}
			<div
				class={cn(
					'aspect-[4/3] animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800',
					i === 0 && 'sm:col-span-2 sm:row-span-2',
				)}>
			</div>
		{/each}
	</div>
</div>
