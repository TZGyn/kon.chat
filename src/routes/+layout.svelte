<script lang="ts">
	import AppSidebar from './(components)/app-sidebar.svelte'
	import * as Sidebar from '$lib/components/ui/sidebar/index.js'
	import '../app.css'
	import { Toaster } from '$lib/components/ui/sonner'
	import 'katex/dist/katex.css'
	import { ModeWatcher } from 'mode-watcher'
	import { useLocale } from '$lib/states/lang.svelte'
	import OpenaiApikeyChecker from './(components)/openai-apikey-checker.svelte'

	let { children } = $props()

	const locale = useLocale()
</script>

{#key locale.lang}
	<Sidebar.Provider>
		<AppSidebar />
		<Sidebar.Inset class="@container/main">
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
	<ModeWatcher defaultMode="system" />
	<OpenaiApikeyChecker />
{/key}
