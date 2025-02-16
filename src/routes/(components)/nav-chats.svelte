<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js'
	import { onMount } from 'svelte'
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js'
	import {
		Ellipsis,
		MessageCircleCodeIcon,
		MessageCircleIcon,
		PlusIcon,
		Trash2Icon,
	} from 'lucide-svelte'
	import { page } from '$app/state'
	import { useChats } from '../state.svelte.js'
	import { customFetch } from '$lib/fetch.js'
	import { cn } from '$lib/utils.js'

	const sidebar = Sidebar.useSidebar()

	let chats = useChats()

	const deleteChat = async (id: string) => {
		const success = (
			await customFetch<{ success: boolean }>(`/chat/${id}`, {
				method: 'DELETE',
			})
		).success

		chats.getChats()
	}

	onMount(() => {
		chats.getChats()
	})
</script>

<Sidebar.Group>
	<Sidebar.GroupLabel>Chat</Sidebar.GroupLabel>

	<Sidebar.Menu>
		{#if sidebar.open || sidebar.isMobile}
			{#each chats.chats as chat}
				<Sidebar.MenuItem>
					<Sidebar.MenuButton
						isActive={page.url.pathname === `/chat/${chat.id}`}>
						{#snippet child({ props })}
							<a
								href={`/chat/${chat.id}`}
								title={chat.title}
								{...props}>
								<!-- <span>{item.emoji}</span> -->
								<span>{chat.title}</span>
							</a>
						{/snippet}
					</Sidebar.MenuButton>
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<Sidebar.MenuAction showOnHover {...props}>
									<Ellipsis />
									<span class="sr-only">More</span>
								</Sidebar.MenuAction>
							{/snippet}
						</DropdownMenu.Trigger>
						<DropdownMenu.Content
							class="w-56 rounded-lg"
							side={sidebar.isMobile ? 'bottom' : 'right'}
							align={sidebar.isMobile ? 'end' : 'start'}>
							<!-- <DropdownMenu.Item>
							<StarOff class="text-muted-foreground" />
							<span>Remove from Favorites</span>
						</DropdownMenu.Item>
						<DropdownMenu.Separator /> -->
							<!-- <DropdownMenu.Item
							onclick={() => regenerateChatTitle(chat.id)}>
							<RefreshCwIcon class="text-muted-foreground" />
							<span>
								Regenerate Title <span
									class="text-muted-foreground text-sm">
									(1 credit)
								</span>
							</span>
						</DropdownMenu.Item> -->
							<!-- <DropdownMenu.Item>
							<Link class="text-muted-foreground" />
							<span>Copy Link</span>
						</DropdownMenu.Item>
						<DropdownMenu.Item>
							<ArrowUpRight class="text-muted-foreground" />
							<span>Open in New Tab</span>
						</DropdownMenu.Item> -->
							<DropdownMenu.Separator />
							<DropdownMenu.Item
								onclick={() => deleteChat(chat.id)}
								class="text-destructive data-[highlighted]:bg-destructive data-[highlighted]:text-white">
								<Trash2Icon />
								<span>Delete</span>
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</Sidebar.MenuItem>
			{/each}
			<Sidebar.MenuItem>
				<Sidebar.MenuButton class="text-sidebar-foreground/70">
					{#snippet child({ props })}
						<a href="/chat" {...props}>
							<PlusIcon />
							<span>New Chat</span>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		{:else}
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
		{/if}
	</Sidebar.Menu>
</Sidebar.Group>
