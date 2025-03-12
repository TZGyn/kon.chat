<script lang="ts">
	import type { ToolInvocation } from '@ai-sdk/ui-utils'
	import Twitter from './tool/twitter.svelte'
	import TwitterLogo from './tool/icons/twitter-logo.svelte'
	import { Skeleton } from '$lib/components/ui/skeleton'
	import WebSearch from './tool/web-search.svelte'
	import type { UIMessage } from 'ai'

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
	<div class="mt-4">
		<WebSearch
			{result}
			{args}
			annotations={(message?.annotations?.filter(
				(a: any) => a.type === 'query_completion',
			) as QueryCompletion[]) || []} />
	</div>
{:else if 'result' in toolInvocation}
	{#if toolInvocation.toolName === 'x_search'}
		<Twitter {toolInvocation} />
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
{/if}
