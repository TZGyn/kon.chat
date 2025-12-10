<script lang="ts">
	import type { ToolResult } from 'ai'
	import TwitterCard from './twitter-card.svelte'
	import { ScrollArea } from '$lib/components/ui/scroll-area'
	import { m } from '$lib/paraglide/messages'

	let {
		toolInvocation,
	}: {
		toolInvocation: {
			state: 'result'
			step?: number
		} & ToolResult<string, any, any>
	} = $props()

	let posts = $derived<
		{
			id: string
			url: string
			title: string
			author?: string
			publishedDate?: string
			text: string
			highlights?: string[]
			tweetId: string
		}[]
	>(toolInvocation.result)
</script>

{#if posts.length > 0}
	<div class="text-lg font-bold">{m['tools.x.x_posts']()}</div>
	<ScrollArea
		class="w-[min(100vw-2rem,600px)] rounded border whitespace-nowrap"
		orientation="horizontal">
		<div class="flex w-max space-x-4 p-4">
			{#each posts as post}
				<TwitterCard tweet_id={post.tweetId} />
			{/each}
		</div>
	</ScrollArea>
{/if}
