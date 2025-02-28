<script lang="ts">
	import { goto } from '$app/navigation'
	import { Button } from '$lib/components/ui/button'
	import { Input } from '$lib/components/ui/input'
	import { Label } from '$lib/components/ui/label'

	let url = $state('')
	let goButton = $state<HTMLAnchorElement | null>(null)

	let youtubeId = $derived.by(() => {
		// https://codepen.io/catmull/pen/XWQPrQ
		var newval: RegExpMatchArray | null

		if ((newval = url.match(/(\?|&)v=([^&#]+)/))) {
			return newval.pop()
		} else if ((newval = url.match(/(\.be\/)+([^\/]+)/))) {
			return newval.pop()
		} else if ((newval = url.match(/(\embed\/)+([^\/]+)/))) {
			return newval.pop()?.replace('?rel=0', '')
		}

		return undefined
	})
</script>

<div class="flex flex-1 flex-col items-center justify-center p-4">
	<div class="flex w-full max-w-[500px] flex-col gap-2">
		<Label for="url">Youtube URL</Label>
		<div class="flex w-full gap-2">
			<Input
				id="url"
				bind:value={url}
				class="bg-secondary"
				placeholder="Paste youtube link here..."
				onkeydown={(event) => {
					if (event.key === 'Enter' && !event.shiftKey) {
						event.preventDefault()

						goButton?.click()
					}
				}} />
			{#key youtubeId}
				<Button
					bind:ref={goButton}
					href={!youtubeId ? '' : `/youtube/${youtubeId}`}>
					Go
				</Button>
			{/key}
		</div>
		{#if url && youtubeId === undefined}
			<span class="text-destructive text-md">Invalid URL</span>
		{/if}
	</div>
</div>
