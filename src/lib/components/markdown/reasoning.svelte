<script lang="ts">
	import { Toggle } from '$lib/components/ui/toggle/index.js'
	import { UseAutoScroll } from '$lib/hooks/use-auto-scroll.svelte'
	import { ChevronDownIcon } from 'lucide-svelte'

	let { reasoning }: { reasoning: string } = $props()

	const autoScroll = new UseAutoScroll()
</script>

<div>
	<Toggle
		size="sm"
		class="text-muted-foreground group peer bg-secondary w-full justify-between border data-[state=on]:rounded-b-none">
		Reasoning
		<ChevronDownIcon
			class={'transition-transform group-data-[state=on]:rotate-180'} />
	</Toggle>
	<div
		bind:this={autoScroll.ref}
		class="text-muted-foreground hidden max-h-[350px] overflow-y-scroll rounded-md rounded-t-none border p-2 text-sm peer-data-[state=on]:block">
		{#key reasoning}
			<span>
				{reasoning}
			</span>
		{/key}
	</div>
</div>
