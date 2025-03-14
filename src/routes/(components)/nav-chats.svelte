<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js'
	import { onMount } from 'svelte'
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js'
	import { MessageCircleIcon, PlusIcon, XIcon } from 'lucide-svelte'
	import { page } from '$app/state'
	import { useChats } from '../state.svelte.js'
	import { cn } from '$lib/utils.js'
	import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte'

	const sidebar = Sidebar.useSidebar()

	let chats = useChats()

	onMount(() => {
		chats.getChats()
	})
</script>

<Sidebar.Group class="flex-1 overflow-hidden">
	<Sidebar.GroupLabel>Chat</Sidebar.GroupLabel>

	{#if sidebar.open || sidebar.isMobile}
		<ScrollArea class="overflow-hidden" scrollbarYClasses={'hidden'}>
			<Sidebar.Menu class="">
				{#each chats.chats as chat}
					<Sidebar.MenuItem class="group/menu-button">
						<Sidebar.MenuButton
							isActive={page.url.pathname === `/chat/${chat.id}`}>
							{#snippet child({ props })}
								<a
									href={`/chat/${chat.id}`}
									title={chat.title}
									{...props}
									class={cn(
										props.class as string,
										'group-hover/menu-button:group-has-data-[sidebar=menu-action]/menu-item:pr-6 group-has-data-[sidebar=menu-action]/menu-item:pr-2 h-12 rounded transition-[width,height]',
									)}>
									<!-- <span>{item.emoji}</span> -->
									<span class="">{chat.title}</span>
								</a>
							{/snippet}
						</Sidebar.MenuButton>
						<Sidebar.MenuAction
							showOnHover
							class="top-1/2"
							onclick={() => chats.deleteChats(chat.id)}>
							<XIcon />
							<span class="sr-only">Delete</span>
						</Sidebar.MenuAction>
					</Sidebar.MenuItem>
				{/each}
			</Sidebar.Menu>
		</ScrollArea>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton class="text-sidebar-foreground/70">
					{#snippet child({ props })}
						<a
							href="/chat"
							{...props}
							data-sveltekit-preload-code="eager">
							<PlusIcon />
							<span>New Chat</span>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	{:else}
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Sidebar.MenuButton
								class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
								{...props}>
								<MessageCircleIcon class="size-4" />
							</Sidebar.MenuButton>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content
						class="w-[--bits-dropdown-menu-anchor-width] min-w-56 rounded-lg"
						side={sidebar.isMobile ? 'bottom' : 'right'}
						align="end"
						sideOffset={4}>
						<DropdownMenu.Group>
							<DropdownMenu.GroupHeading>
								Chats
							</DropdownMenu.GroupHeading>
							<DropdownMenu.Separator />
							{#each chats.chats as chat}
								<DropdownMenu.Item>
									{#snippet child({ props })}
										<a
											href={`/chat/${chat.id}`}
											title={chat.title}
											{...props}>
											<!-- <span>{item.emoji}</span> -->
											<span>{chat.title}</span>
										</a>
									{/snippet}
								</DropdownMenu.Item>
							{/each}
							<DropdownMenu.Separator />
							<DropdownMenu.Item>
								{#snippet child({ props })}
									<a
										href={`/chat`}
										title={'new chat'}
										{...props}
										class={cn(
											'text-muted-foreground',
											props.class as string,
										)}>
										<PlusIcon />
										<span>New Chat</span>
									</a>
								{/snippet}
							</DropdownMenu.Item>
						</DropdownMenu.Group>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	{/if}
</Sidebar.Group>
