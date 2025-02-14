<script lang="ts">
	import NavUser from './nav-user.svelte'
	import * as Sidebar from '$lib/components/ui/sidebar/index.js'
	import type { ComponentProps } from 'svelte'
	import * as Avatar from '$lib/components/ui/avatar'
	import NavChats from './nav-chats.svelte'

	let {
		ref = $bindable(null),
		collapsible = 'icon',
		...restProps
	}: ComponentProps<typeof Sidebar.Root> = $props()

	const sidebar = Sidebar.useSidebar()
</script>

<Sidebar.Root bind:ref {collapsible} {...restProps}>
	<Sidebar.Header>
		<Sidebar.Menu>
			<a href="/">
				<Sidebar.MenuItem class="flex items-center gap-4">
					<Avatar.Root class="h-8 w-8 rounded-lg">
						<Avatar.Image src={'/logo.png'} alt={'logo'} />
						<Avatar.Fallback class="rounded-lg">CN</Avatar.Fallback>
					</Avatar.Root>
					{#if sidebar.open}
						Kon.Chat
					{/if}
				</Sidebar.MenuItem>
			</a>
		</Sidebar.Menu>
	</Sidebar.Header>
	<Sidebar.Content>
		<NavChats />
	</Sidebar.Content>
	<Sidebar.Footer>
		<NavUser />
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
