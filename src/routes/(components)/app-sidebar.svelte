<script lang="ts">
	import NavUser from './nav-user.svelte'
	import * as Sidebar from '$lib/components/ui/sidebar/index.js'
	import type { ComponentProps } from 'svelte'
	import * as Avatar from '$lib/components/ui/avatar'
	import NavChats from './nav-chats.svelte'
	import {
		AppWindowIcon,
		ImageIcon,
		LayoutTemplateIcon,
		NotepadTextIcon,
		YoutubeIcon,
	} from 'lucide-svelte'
	import { PlusIcon } from '@lucide/svelte'
	import { m } from '$lib/paraglide/messages'
	import { cn } from '$lib/utils'

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
	<Sidebar.Content class="overflow-hidden">
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
				<Sidebar.MenuItem>
					<Sidebar.MenuButton>
						{#snippet child({ props })}
							<a
								href="/website"
								{...props}
								data-sveltekit-preload-code="eager">
								<AppWindowIcon />
								<span>Website Builder</span>
							</a>
						{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			</Sidebar.Menu>
		</Sidebar.Group>
		<Sidebar.Separator />
		<Sidebar.Group class="py-0">
			<Sidebar.Menu>
				<Sidebar.MenuItem>
					<Sidebar.MenuButton class="text-sidebar-foreground/70 py-6">
						{#snippet child({ props })}
							<a
								href="/chat"
								{...props}
								data-sveltekit-preload-code="eager">
								<PlusIcon />
								<span>{m.new_chat()}</span>
							</a>
						{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			</Sidebar.Menu>
		</Sidebar.Group>
		<Sidebar.Separator />
		<NavChats />
	</Sidebar.Content>
	<Sidebar.Footer>
		<NavUser />
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
