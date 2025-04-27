<script>
	import { goto } from '$app/navigation'
	import { Button } from '$lib/components/ui/button'
	import { nanoid } from '$lib/nanoid'
	import * as m from '$lib/paraglide/messages'

	import { PartyPopperIcon, PlusIcon } from 'lucide-svelte'
</script>

<div class="flex flex-1 items-center justify-center">
	<div
		class="text-muted-foreground flex flex-col items-center gap-12">
		<PartyPopperIcon class="size-32" />
		<span class="flex items-center gap-2 text-xl">
			{m.welcome_to_kon_chat()}
		</span>
		<Button
			href="/chat"
			class="flex items-center justify-between gap-2"
			data-sveltekit-preload-code="eager">
			<PlusIcon class="size-5" />
			{m.new_chat()}
		</Button>
		<!-- <div class="flex flex-col gap-4">
			<a
				href={`/dashboard/${data.activeBusinessId}/market`}
				class="hover:text-primary flex items-center justify-between gap-4">
				Market Research
				<ArrowRight class="size-5" />
			</a>
			<a
				href={`/dashboard/${data.activeBusinessId}/landing`}
				class="hover:text-primary flex items-center justify-between gap-4">
				Landing Page Generator
				<ArrowRight class="size-5" />
			</a>
			<a
				href={`/dashboard/${data.activeBusinessId}/assets`}
				class="hover:text-primary flex items-center justify-between gap-4">
				Assets Generator
				<ArrowRight class="size-5" />
			</a>
			<a
				href={`/dashboard/${data.activeBusinessId}/summarizer`}
				class="hover:text-primary flex items-center justify-between gap-4">
				Summarizer
				<ArrowRight class="size-5" />
			</a>
		</div> -->
	</div>
</div>
