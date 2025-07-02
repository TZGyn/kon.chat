<script lang="ts">
	import { page } from '$app/state'
	import { Button } from '$lib/components/ui/button'
	import { ScrollArea } from '$lib/components/ui/scroll-area'
	import * as m from '$lib/paraglide/messages.js'

	let { children } = $props()

	const routes = [
		{ label: 'settings.navigation.account', href: '/settings' },
		{ label: 'settings.navigation.models', href: '/settings/models' },
	] as const
</script>

<div class="relative flex flex-1 overflow-hidden">
	<ScrollArea
		class="@container/settings flex flex-1 flex-col items-center p-4">
		<div class="flex w-full flex-col items-center">
			<div class="flex gap-2 p-4">
				<div class="flex w-full max-w-48 flex-col gap-4 border-r p-4">
					{#each routes as route}
						<Button
							href={route.href}
							variant={route.href === page.url.pathname
								? 'secondary'
								: 'ghost'}
							data-sveltekit-preload-code="eager"
							class="sticky top-6 justify-start">
							{m[route.label]()}
						</Button>
					{/each}
				</div>
				<div class="min-h-[700px] w-[100cqw] max-w-[700px]">
					{@render children?.()}
				</div>
			</div>
		</div>
	</ScrollArea>
</div>
