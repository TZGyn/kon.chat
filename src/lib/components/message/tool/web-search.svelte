<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js'
	import * as Accordion from '$lib/components/ui/accordion/index.js'
	import { cn } from '$lib/utils'
	import {
		CalendarIcon,
		CheckIcon,
		ExternalLinkIcon,
		GlobeIcon,
		SearchIcon,
	} from 'lucide-svelte'
	import ImageGrid from './image-grid.svelte'
	import * as Avatar from '$lib/components/ui/avatar/index.js'
	import { Button, buttonVariants } from '$lib/components/ui/button'
	import * as Dialog from '$lib/components/ui/dialog'
	import { ScrollArea } from '$lib/components/ui/scroll-area'

	type SearchImage = {
		url: string
		description: string
	}

	type SearchResult = {
		url: string
		title: string
		content: string
		raw_content: string
		published_date?: string
	}

	type SearchQueryResult = {
		query: string
		results: SearchResult[]
		images: SearchImage[]
	}

	type MultiSearchResponse = {
		searches: SearchQueryResult[]
	}

	type MultiSearchArgs = {
		queries: string[]
		maxResults: number[]
		topics: ('general' | 'news')[]
		searchDepth: ('basic' | 'advanced')[]
	}

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
		args,
		result,
		annotations,
	}: {
		result: MultiSearchResponse | null
		args: MultiSearchArgs
		annotations?: QueryCompletion[]
	} = $props()

	// Collect all images from all searches
	let allImages = $derived(
		result?.searches.reduce<SearchImage[]>((acc, search) => {
			return [...acc, ...search.images]
		}, []),
	)

	let totalResults = $derived(
		result?.searches.reduce(
			(sum, search) => sum + search.results.length,
			0,
		),
	)
</script>

<div class="bg-popover w-full rounded border p-4">
	{#if !result}
		{@const totalResults = (annotations ?? []).reduce(
			(sum, a) => sum + a.data.resultsCount,
			0,
		)}
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
	{:else}
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
					{totalResults} Results
				</Badge>
			</div>
		</div>
	{/if}

	<div class="flex flex-col gap-2 py-3 pb-6">
		{#if !result}
			<div class="flex gap-2 overflow-x-auto">
				{#each args.queries as query, i}
					{@const annotation = (annotations ?? []).find(
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
		{:else}
			<div class="flex gap-2 overflow-x-auto">
				{#each result.searches as search, i}
					<Badge
						variant="secondary"
						class="flex-shrink-0 rounded-full bg-neutral-100 px-3 py-1.5 dark:bg-neutral-800">
						<SearchIcon class="mr-1.5 h-3 w-3" />
						{search.query}
					</Badge>
				{/each}
			</div>
		{/if}

		{#if !result}
			<div class="flex gap-3 pb-1">
				{#each [...Array(2)] as _, i}
					<div
						class="bg-background border-border flex-1 rounded-xl border shadow-sm">
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
		{:else}
			<div
				class="flex max-w-[min(100cqw,600px)] gap-3 overflow-hidden">
				{#if result.searches.length > 0}
					{#each result.searches[0].results.slice(0, 2) as res, resultIndex}
						<div
							class="bg-secondary hover:bg-accent border-border flex-1 overflow-hidden rounded-xl border shadow-sm transition-all hover:cursor-pointer hover:shadow-md">
							<div class="p-4">
								<div class="mb-3 flex items-center gap-2.5">
									<Avatar.Root>
										<Avatar.Image
											src={`https://www.google.com/s2/favicons?sz=128&domain=${new URL(res.url).hostname}`}
											class="size-10"
											alt="kon" />
										<Avatar.Fallback>K</Avatar.Fallback>
									</Avatar.Root>
									<div>
										<h3 class="line-clamp-1 text-sm font-medium">
											{res.title}
										</h3>
										<a
											href={res.url}
											target="_blank"
											rel="noopener noreferrer"
											class="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs">
											{new URL(res.url).hostname}
											<ExternalLinkIcon class="h-3 w-3" />
										</a>
									</div>
								</div>

								<p
									class="text-muted-foreground mb-3 line-clamp-3 text-sm">
									{res.content}
								</p>

								{#if res.published_date}
									<div class="border-border border-t pt-3">
										<time
											class="text-muted-foreground flex items-center gap-1.5 text-xs">
											<CalendarIcon class="h-3 w-3" />
											{new Date(
												res.published_date,
											).toLocaleDateString()}
										</time>
									</div>
								{/if}
							</div>
						</div>
					{/each}
				{/if}
			</div>
			{#if result.searches.flatMap((search) => search.results).length > 2}
				<Dialog.Root>
					<Dialog.Trigger
						class={cn(
							buttonVariants({ variant: 'outline' }),
							'w-full',
						)}>
						View All Sources
						<span class="text-muted-foreground">
							(+{result.searches.flatMap((search) => search.results)
								.length - 2})
						</span>
					</Dialog.Trigger>
					<Dialog.Content>
						<Dialog.Header>
							<Dialog.Title>Sources and links</Dialog.Title>
						</Dialog.Header>
						<ScrollArea>
							<div
								class="grid max-h-[calc(100vh-10rem)] grid-cols-1 gap-2">
								{#each result.searches as search}
									{#each search.results as data, resultIndex}
										<a href={data.url} target="_blank">
											<div
												class="bg-secondary hover:bg-accent flex flex-col gap-1 rounded-md border p-3">
												<span
													class="text-primary-foreground line-clamp-1">
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
								{/each}
							</div>
						</ScrollArea>
					</Dialog.Content>
				</Dialog.Root>
			{/if}
		{/if}
	</div>
	{#if allImages}
		<ImageGrid images={allImages} />
	{/if}
</div>
