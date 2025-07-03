<script lang="ts">
	import { page } from '$app/state'
	import * as m from '$lib/paraglide/messages.js'

	let { children } = $props()

	const routes = [
		{ label: 'settings.navigation.account', href: '/settings' },
		{ label: 'settings.navigation.models', href: '/settings/models' },
	] as const
</script>

<div class="relative flex flex-1 flex-col overflow-hidden">
	<div class="flex w-full flex-col items-center">
		<div class="w-full max-w-[700px] p-4">
			<div class="flex gap-2 border-b">
				{#each routes as route}
					<a
						href={route.href}
						data-active={route.href === page.url.pathname}
						data-sveltekit-preload-code="eager"
						class="text-muted-foreground data-[active=true]:text-primary data-[active=true]:border-primary p-3 data-[active=true]:border-b-2">
						{m[route.label]()}
					</a>
				{/each}
			</div>
		</div>
	</div>
	<div class="@container/settings flex-1 overflow-scroll p-4">
		<div class="flex w-[100cqw] justify-center">
			<div class="w-full max-w-[700px] p-4">
				{@render children?.()}
			</div>
		</div>
	</div>
</div>
