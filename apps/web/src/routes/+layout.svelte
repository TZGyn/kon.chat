<script lang="ts">
	import AppSidebar from './(components)/app-sidebar.svelte'
	import * as Sidebar from '$lib/components/ui/sidebar/index.js'
	import '../app.css'
	import { Toaster } from '$lib/components/ui/sonner'
	import 'katex/dist/katex.css'
	import { ModeWatcher } from 'mode-watcher'
	import { useLocale } from '$lib/states/lang.svelte'
	import OpenaiApikeyChecker from './(components)/openai-apikey-checker.svelte'
	import { page } from '$app/state'
	import { cn } from '$lib/utils'
	import WebsocketListener from './(components)/websocket-listener.svelte'

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
			{#if page.url.pathname.startsWith('/chat')}
				<Sidebar.Trigger class="absolute top-4 left-4 z-50" />
			{:else}
				<header
					class="bg-sidebar flex h-12 items-center border-b px-4">
					<Sidebar.Trigger class="z-50" />
				</header>
			{/if}

			<div
				class={cn(
					'flex  flex-1 overflow-hidden',
					page.url.pathname.startsWith('/chat')
						? 'max-h-svh'
						: 'max-h-[calc(100svh-3rem)]',
				)}>
				<div class="flex w-full flex-1 flex-col">
					{@render children()}
				</div>
			</div>
		</Sidebar.Inset>
	</Sidebar.Provider>
	<Toaster richColors position="top-right" />
	<ModeWatcher defaultMode="system" />
	<OpenaiApikeyChecker />
	<WebsocketListener />
{/key}
