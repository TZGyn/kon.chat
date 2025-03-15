<script lang="ts">
	import Markdown from '$lib/components/markdown.svelte'
	import { nanoid } from '$lib/nanoid'
	import { cn } from '$lib/utils'
	import * as Accordion from '$lib/components/ui/accordion/index.js'
	import { GlobeIcon, LibraryBigIcon } from 'lucide-svelte'

	let {
		result,
	}: {
		result: {
			result:
				| {
						code: number
						status: number
						data: {
							title: string
							description: string
							url: string
							content: string
							usage: {
								tokens: number
							}
						}
				  }
				| undefined
		}
	} = $props()
</script>

{#if result.result}
	<Accordion.Root type="single">
		<Accordion.Item value="markdown">
			<Accordion.Trigger
				class={cn('p-4 shadow-sm hover:no-underline')}>
				<div class="flex w-full items-center justify-between">
					<div class="flex items-center gap-2">
						<div
							class="rounded-lg bg-neutral-100 p-2 dark:bg-neutral-800">
							<LibraryBigIcon class="h-4 w-4 text-neutral-500" />
						</div>
						<div>
							<h2 class="pr-4 text-start font-medium">
								{result.result.data.title}
							</h2>
							<span
								class="text-muted-foreground line-clamp-1 pr-4 text-start text-sm">
								{result.result.data.url}
							</span>
						</div>
					</div>
				</div>
			</Accordion.Trigger>
			<Accordion.Content>
				<div class={cn('bg-background w-fit rounded-xl')}>
					<div
						class="prose prose-neutral dark:prose-invert prose-p:my-0">
						<Markdown
							content={result.result.data.content}
							id={`tool-${nanoid()}`} />
					</div>
				</div>
			</Accordion.Content>
		</Accordion.Item>
	</Accordion.Root>
{/if}
