<script lang="ts">
	import Markdown from '$lib/components/markdown'
	import { nanoid } from '$lib/nanoid'
	import { cn } from '$lib/utils'
	import { LibraryBigIcon } from 'lucide-svelte'

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
	<div class="rounded border">
		<div
			class="bg-secondary flex w-full items-center justify-between p-2">
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
						class="text-muted-foreground line-clamp-1 text-start text-sm">
						{result.result.data.url}
					</span>
				</div>
			</div>
		</div>
		<div
			class={cn(
				'bg-background max-h-[max(50vh,500px)] w-full overflow-scroll p-2',
			)}>
			<div class="prose prose-neutral dark:prose-invert prose-p:my-0">
				<Markdown
					content={result.result.data.content}
					id={`tool-${nanoid()}`} />
			</div>
		</div>
	</div>
{/if}
