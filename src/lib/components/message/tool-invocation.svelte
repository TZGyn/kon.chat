<script lang="ts">
	import type { ToolInvocation } from '@ai-sdk/ui-utils'
	import Twitter from './tool/twitter.svelte'
	import TwitterLogo from './tool/icons/twitter-logo.svelte'
	import { Skeleton } from '$lib/components/ui/skeleton'
	import WebSearch from './tool/web-search.svelte'
	import type { UIMessage } from 'ai'
	import AcademicSearch from './tool/academic-search.svelte'
	import { BookIcon, LibraryBigIcon } from 'lucide-svelte'
	import WebReader from './tool/web-reader.svelte'
	import ImageGeneration from './tool/image-generation.svelte'
	import { ImageIcon } from '@lucide/svelte'

	let {
		toolInvocation,
		message,
	}: { toolInvocation: ToolInvocation; message: UIMessage } = $props()

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

	let args = $derived(JSON.parse(JSON.stringify(toolInvocation.args)))
	let result = $derived(
		'result' in toolInvocation
			? JSON.parse(JSON.stringify(toolInvocation.result))
			: null,
	)
</script>

{#if toolInvocation.toolName === 'web_search'}
	<WebSearch
		{result}
		{args}
		annotations={(message?.annotations?.filter(
			(a: any) => a.type === 'query_completion',
		) as QueryCompletion[]) || []} />
{:else if 'result' in toolInvocation}
	{#if toolInvocation.toolName === 'x_search'}
		<Twitter {toolInvocation} />
	{:else if toolInvocation.toolName === 'academic_search'}
		<AcademicSearch result={toolInvocation.result} />
	{:else if toolInvocation.toolName === 'web_reader'}
		<WebReader result={toolInvocation.result} />
	{:else if toolInvocation.toolName === 'image_generation'}
		<ImageGeneration result={toolInvocation.result} />
	{/if}
{:else if toolInvocation.toolName === 'x_search'}
	<div class="flex items-center gap-4 p-4">
		<div
			class="flex size-12 animate-pulse items-center justify-center rounded-full border object-cover p-3">
			<TwitterLogo />
		</div>
		<div class="flex animate-pulse flex-col justify-start gap-2">
			<div>Getting X's Posts</div>
			<div class="flex items-center gap-2">
				<Skeleton class="h-2 w-8" />
				<Skeleton class="h-2 w-16" />
			</div>
		</div>
	</div>
{:else if toolInvocation.toolName === 'academic_search'}
	<div class="flex items-center gap-4 p-4">
		<div
			class="flex size-12 animate-pulse items-center justify-center rounded-full border object-cover p-3">
			<BookIcon />
		</div>
		<div class="flex animate-pulse flex-col justify-start gap-2">
			<div>Getting Academic's Papers</div>
			<div class="flex items-center gap-2">
				<Skeleton class="h-2 w-8" />
				<Skeleton class="h-2 w-16" />
			</div>
		</div>
	</div>
{:else if toolInvocation.toolName === 'web_reader'}
	<div class="flex items-center gap-4 p-4">
		<div
			class="flex size-12 animate-pulse items-center justify-center rounded-full border object-cover p-3">
			<LibraryBigIcon />
		</div>
		<div class="flex animate-pulse flex-col justify-start gap-2">
			<div>Reading article</div>
			<div class="flex items-center gap-2">
				<Skeleton class="h-2 w-8" />
				<Skeleton class="h-2 w-16" />
			</div>
		</div>
	</div>
{:else if toolInvocation.toolName === 'image_generation'}
	<!-- https://github.com/cruip/cruip-tutorials/blob/main/animated-gradient-border/index.html -->
	<div
		class="h-96 w-full animate-[border_4s_linear_infinite] rounded-2xl border border-transparent [background:linear-gradient(45deg,hsl(var(--background)))_padding-box,conic-gradient(from_var(--border-angle),hsl(var(--secondary))_80%,hsl(var(--primary))_86%,hsl(var(--primary))_90%,hsl(var(--primary))_94%,hsl(var(--secondary)))_border-box]">
		<div class="flex h-full items-center justify-center gap-4 p-4">
			<div
				class="flex size-32 animate-pulse items-center justify-center rounded-full border object-cover p-3">
				<ImageIcon class="size-16" />
			</div>
		</div>
	</div>
{/if}

<style lang="postcss">
	@property --border-angle {
		inherits: false;
		initial-value: 0deg;
		syntax: '<angle>';
	}
</style>
