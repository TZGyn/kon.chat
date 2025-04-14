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
	<div class="flex items-center gap-4 p-4">
		<div
			class="flex size-12 animate-pulse items-center justify-center rounded-full border object-cover p-3">
			<ImageIcon />
		</div>
		<div class="flex animate-pulse flex-col justify-start gap-2">
			<div>Generating Image</div>
			<div class="flex items-center gap-2">
				<Skeleton class="h-2 w-8" />
				<Skeleton class="h-2 w-16" />
			</div>
		</div>
	</div>
{/if}
