<script lang="ts">
	import { Button } from '$lib/components/ui/button'
	import * as Card from '$lib/components/ui/card'
	import { ScrollArea } from '$lib/components/ui/scroll-area'
	import {
		BookIcon,
		CalendarIcon,
		DownloadIcon,
		FileTextIcon,
		User2Icon,
	} from 'lucide-svelte'

	type AcademicResult = {
		title: string
		url: string
		author?: string | null
		publishedDate?: string
		summary: string
	}
	let { result }: { result: { results: AcademicResult[] } } = $props()
</script>

<Card.Root class="w-full max-w-[min(100cqw,600px)] overflow-hidden">
	<Card.Header
		class="flex flex-row items-center justify-between pb-2">
		<div class="flex items-center gap-2">
			<div
				class="from-primary/20 to-primary-600/20 flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br backdrop-blur-sm">
				<BookIcon class="text-primary h-4 w-4" />
			</div>
			<div>
				<Card.Title>Academic Papers</Card.Title>
				<p class="text-muted-foreground text-sm">
					Found {result.results.length} papers
				</p>
			</div>
		</div>
	</Card.Header>
	<Card.Content>
		<ScrollArea orientation="horizontal">
			<div class="flex gap-4">
				{#each result.results as paper, index}
					<div class="w-[400px] flex-none">
						<div class="group relative h-[300px]">
							<div
								class="bg-background border-accent flex h-full flex-col gap-4 rounded-xl border p-4">
								<h3 class="line-clamp-2 text-xl font-semibold">
									{paper.title}
								</h3>

								<div class="flex flex-wrap gap-2">
									{#if paper.author}
										<div
											class="text-muted-foreground bg-accent inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm">
											<User2Icon
												class="text-primary h-3.5 min-h-3.5 w-3.5 min-w-3.5" />
											<span class="line-clamp-1">
												{paper.author
													.split(';')
													.slice(0, 2)
													.join(', ') +
													(paper.author.split(';').length > 2
														? ' et al.'
														: '')}
											</span>
										</div>
									{/if}

									{#if paper.publishedDate}
										<div
											class="text-muted-foreground bg-accent inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm">
											<CalendarIcon
												class="text-primary size-3.5 min-h-3.5 min-w-3.5" />
											{new Date(
												paper.publishedDate,
											).toLocaleDateString()}
										</div>
									{/if}
								</div>

								<div class="flex-1">
									<p
										class="text-muted-foreground line-clamp-4 text-sm">
										{paper.summary}
									</p>
								</div>

								<div class="flex gap-2">
									<Button
										variant="secondary"
										onclick={() => window.open(paper.url, '_blank')}
										class="flex-1">
										<FileTextIcon class="mr-2 h-4 w-4" />
										View Paper
									</Button>

									{#if paper.url.includes('arxiv.org')}
										<Button
											variant="secondary"
											size="icon"
											onclick={() =>
												window.open(
													paper.url.replace('abs', 'pdf'),
													'_blank',
												)}>
											<DownloadIcon />
										</Button>
									{/if}
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</ScrollArea>
	</Card.Content>
</Card.Root>
