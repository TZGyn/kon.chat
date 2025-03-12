<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js'
	import * as Accordion from '$lib/components/ui/accordion/index.js'
	import { cn } from '$lib/utils'
	import {
		CalendarIcon,
		ExternalLinkIcon,
		GlobeIcon,
		SearchIcon,
	} from 'lucide-svelte'
	import WebSearchLoading from './web-search-loading.svelte'
	import ImageGrid from './image-grid.svelte'
	import * as Avatar from '$lib/components/ui/avatar/index.js'
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

{#if !result}
	<WebSearchLoading
		queries={args.queries}
		annotations={annotations ?? []} />
{:else}
	<div class="w-full space-y-4">
		<Accordion.Root value={'search'} type="single" class="w-full">
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
								{totalResults} Results
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
							{#each result.searches as search, i}
								<Badge
									variant="secondary"
									class="flex-shrink-0 rounded-full bg-neutral-100 px-3 py-1.5 dark:bg-neutral-800">
									<SearchIcon class="mr-1.5 h-3 w-3" />
									{search.query}
								</Badge>
							{/each}
						</div>

						<div class="no-scrollbar flex gap-3 overflow-x-auto">
							{#each result.searches as search, i}
								{#each search.results as result, resultIndex}
									<div
										class="bg-background border-border w-[300px] flex-shrink-0 rounded-xl border shadow-sm transition-all hover:shadow-md">
										<div class="p-4">
											<div class="mb-3 flex items-center gap-2.5">
												<Avatar.Root>
													<Avatar.Image
														src={`https://www.google.com/s2/favicons?sz=128&domain=${new URL(result.url).hostname}`}
														class="size-10"
														alt="@shadcn" />
													<Avatar.Fallback>CN</Avatar.Fallback>
												</Avatar.Root>
												<div>
													<h3
														class="line-clamp-1 text-sm font-medium">
														{result.title}
													</h3>
													<a
														href={result.url}
														target="_blank"
														rel="noopener noreferrer"
														class="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs">
														{new URL(result.url).hostname}
														<ExternalLinkIcon class="h-3 w-3" />
													</a>
												</div>
											</div>

											<p
												class="text-muted-foreground mb-3 line-clamp-3 text-sm">
												{result.content}
											</p>

											{#if result.published_date}
												<div class="border-border border-t pt-3">
													<time
														class="text-muted-foreground flex items-center gap-1.5 text-xs">
														<CalendarIcon class="h-3 w-3" />
														{new Date(
															result.published_date,
														).toLocaleDateString()}
													</time>
												</div>
											{/if}
										</div>
									</div>
								{/each}
							{/each}
						</div>
					</div>
				</Accordion.Content>
			</Accordion.Item>
		</Accordion.Root>

		{#if allImages}
			<ImageGrid images={allImages} />
		{/if}
	</div>
{/if}
