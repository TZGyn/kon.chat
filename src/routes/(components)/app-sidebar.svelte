<script lang="ts">
	import NavUser from './nav-user.svelte'
	import * as Sidebar from '$lib/components/ui/sidebar/index.js'
	import type { ComponentProps } from 'svelte'
	import * as Avatar from '$lib/components/ui/avatar'
	import NavChats from './nav-chats.svelte'
	import { NotepadTextIcon, YoutubeIcon } from 'lucide-svelte'

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
			<Sidebar.MenuItem class="flex justify-between gap-4">
				{#if sidebar.open || sidebar.isMobile}
					<a href="/">
						<div class="flex items-center gap-4">
							<Avatar.Root class="h-8 w-8 rounded-lg">
								<Avatar.Image src={'/logo.png'} alt={'logo'} />
								<Avatar.Fallback class="rounded-lg">
									CN
								</Avatar.Fallback>
							</Avatar.Root>
							Kon.Chat
						</div>
					</a>
				{/if}
				<Sidebar.Trigger class="z-50" />
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>
	<Sidebar.Content>
		<NavChats />
		<Sidebar.Separator />
		<Sidebar.Group>
			<Sidebar.GroupLabel>Tools</Sidebar.GroupLabel>
			<Sidebar.Menu>
				<Sidebar.MenuItem>
					<Sidebar.MenuButton class="">
						{#snippet child({ props })}
							<a
								href="/documents"
								{...props}
								data-sveltekit-preload-code="eager">
								<NotepadTextIcon />
								<span>Documents</span>
							</a>
						{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
				<Sidebar.MenuItem>
					<Sidebar.MenuButton>
						{#snippet child({ props })}
							<a
								href="/youtube"
								{...props}
								data-sveltekit-preload-code="eager">
								<YoutubeIcon />
								<span>Youtube</span>
							</a>
						{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			</Sidebar.Menu>
		</Sidebar.Group>
	</Sidebar.Content>
	<Sidebar.Footer>
		<NavUser />
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
