<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js'
	import { Button } from '$lib/components/ui/button/index.js'
	import { m } from '$lib/paraglide/messages'

	let {
		updatePrompt,
	}: {
		updatePrompt: (value: string) => void
	} = $props()
</script>

<div class="flex w-full flex-col items-center gap-4">
	<!-- <Badge variant="secondary">Suggestions</Badge> -->
	<div class="grid grid-cols-2 gap-x-4 gap-y-2">
		<Button
			variant="secondary"
			class="hover:bg-secondary w-full border"
			onclick={() =>
				updatePrompt(m['suggestions.coding.python_for_loop']())}>
			{m['suggestions.coding.python_for_loop']()}
		</Button>
		<Button
			variant="secondary"
			class="hover:bg-secondary w-full border"
			onclick={() =>
				updatePrompt(m['suggestions.search.apple_stock']())}>
			{m['suggestions.search.apple_stock']()}
		</Button>
		<Button
			variant="secondary"
			class="hover:bg-secondary w-full border"
			onclick={() =>
				updatePrompt(m['suggestions.search.latest_openai_model']())}>
			{m['suggestions.search.latest_openai_model']()}
		</Button>
		<Button
			variant="secondary"
			class="hover:bg-secondary w-full border"
			onclick={() =>
				updatePrompt(m['suggestions.search.usd_to_yen']())}>
			{m['suggestions.search.usd_to_yen']()}
		</Button>
	</div>
</div>
