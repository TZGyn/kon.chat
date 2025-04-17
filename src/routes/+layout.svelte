<script lang="ts">
	import AppSidebar from './(components)/app-sidebar.svelte'
	import * as Sidebar from '$lib/components/ui/sidebar/index.js'
	import '../app.css'
	import { Toaster } from '$lib/components/ui/sonner'
	import 'katex/dist/katex.css'
	import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit'
	import VersionChecker from './(components)/version-checker.svelte'

	let { children } = $props()
	injectSpeedInsights()
</script>

<Sidebar.Provider>
	<AppSidebar />
	<Sidebar.Inset>
		<!-- <header
			class="flex h-16 shrink-0 items-center justify-between gap-2 bg-transparent px-4">
		</header> -->
		<div class="flex max-h-svh flex-1 overflow-hidden">
			<div class="flex w-full flex-1 flex-col">
				{@render children()}
			</div>
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
<Toaster richColors position="top-right" />
<!-- <VersionChecker /> -->
