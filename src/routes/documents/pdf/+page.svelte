<script lang="ts">
	import { Button } from '$lib/components/ui/button'
	import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte'

	let page = $state(0)
</script>

<div></div>
<!-- <div
	class="@container flex flex-1 flex-col items-center justify-center overflow-hidden">
	<div class="h-16">
		<Button onclick={() => (page = (page + 1) % 2)}>
			Swap Page {page}
		</Button>
	</div>
	<div class="@6xl:flex-row flex w-full flex-1 flex-col">
		{#key page}
			<iframe
				title="pdf"
				class="min-h-96 w-full flex-1"
				src={`https://pub-2d65e573d90349849108281adcd7ae75.r2.dev/vfflc6pqqzxl2p2swo5hiutazsvmjnzq/hkbo6h7okifrsxoejkijr7kcnhqry3kz-CCA033_Adv%20Dip%20PA%203.3%2BSKM2%2BSKM3%2BPTPK.2.pdf#page=${page + 1}`}
				frameborder="0">
			</iframe>
			<iframe src=""></iframe>
		{/key}
		<div class="flex-1 overflow-hidden">
			<ScrollArea></ScrollArea>
		</div>
	</div>
</div> -->
