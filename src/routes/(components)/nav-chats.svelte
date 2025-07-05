<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js'
	import { onMount } from 'svelte'
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js'
	import {
		EyeIcon,
		MessageCircleIcon,
		PlusIcon,
		XIcon,
	} from 'lucide-svelte'
	import { page } from '$app/state'
	import { useChats } from '../state.svelte.js'
	import { cn } from '$lib/utils.js'
	import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte'
	import * as m from '$lib/paraglide/messages'
	import * as Dialog from '$lib/components/ui/dialog/index.js'
	import { Button } from '$lib/components/ui/button/index.js'

	const sidebar = Sidebar.useSidebar()

	let chats = useChats()
	let selectedChatId = $state('')
	let openDeleteChatDialog = $state(false)

	const today = new Date()
	today.setHours(0, 0, 0, 0)

	let todayChats = $derived(
		chats.chats.filter(
			(chat) =>
				Math.max(chat.createdAt, chat.updatedAt) >= today.getTime(),
		),
	)

	const yesterday = new Date()
	yesterday.setDate(yesterday.getDate() - 1)
	yesterday.setHours(0, 0, 0, 0)

	let yesterdayChats = $derived(
		chats.chats.filter(
			(chat) =>
				Math.max(chat.createdAt, chat.updatedAt) >=
					yesterday.getTime() &&
				Math.max(chat.createdAt, chat.updatedAt) < today.getTime(),
		),
	)

	const last7days = new Date()
	last7days.setDate(last7days.getDate() - 7)
	last7days.setHours(0, 0, 0, 0)

	let last7DaysChats = $derived(
		chats.chats.filter(
			(chat) =>
				Math.max(chat.createdAt, chat.updatedAt) >=
					last7days.getTime() &&
				Math.max(chat.createdAt, chat.updatedAt) <
					yesterday.getTime(),
		),
	)

	const last30days = new Date()
	last30days.setDate(last30days.getDate() - 30)
	last30days.setHours(0, 0, 0, 0)

	let last30DaysChats = $derived(
		chats.chats.filter(
			(chat) =>
				Math.max(chat.createdAt, chat.updatedAt) >=
					last30days.getTime() &&
				Math.max(chat.createdAt, chat.updatedAt) <
					last7days.getTime(),
		),
	)

	let olderChats = $derived(
		chats.chats.filter(
			(chat) =>
				Math.max(chat.createdAt, chat.updatedAt) <
				last30days.getTime(),
		),
	)

	let allChats = $derived([
		{ title: 'today', chats: todayChats },
		{ title: 'yesterday', chats: yesterdayChats },
		{ title: 'last7days', chats: last7DaysChats },
		{ title: 'last30days', chats: last30DaysChats },
		{ title: 'older', chats: olderChats },
	] as const)

	onMount(() => {
		chats.getChats()
		chats.syncChats()
	})
</script>

<Sidebar.Group class="flex-1 overflow-hidden">
	{#if sidebar.open || sidebar.isMobile}
		<ScrollArea class="overflow-hidden" scrollbarYClasses={'hidden'}>
			{#each allChats as chat_section}
				{#if chat_section.chats.length > 0}
					<Sidebar.GroupLabel
						class="bg-sidebar sticky top-0 z-10 rounded-none">
						{m[chat_section.title]()}
					</Sidebar.GroupLabel>
					<Sidebar.Menu class="">
						{#each chat_section.chats.sort((a, b) => {
							if (a.updatedAt < b.updatedAt) {
								return 1
							} else if (a.updatedAt > b.updatedAt) {
								return -1
							}
							return 0
						}) as chat}
							<Sidebar.MenuItem
								class={cn(
									'group/menu-button',
									chat.status === 'streaming' && 'animate-pulse',
								)}>
								<Sidebar.MenuButton
									isActive={page.url.pathname === `/chat/${chat.id}`}>
									{#snippet child({ props })}
										<a
											href={`/chat/${chat.id}`}
											title={chat.title}
											{...props}
											class={cn(
												props.class as string,
												'h-12 rounded transition-[width,height] group-has-data-[sidebar=menu-action]/menu-item:pr-2 group-hover/menu-button:group-has-data-[sidebar=menu-action]/menu-item:pr-6',
											)}
											data-sveltekit-preload-code="eager">
											{#if chat.visibility === 'public'}
												<EyeIcon class="size-4" />
											{/if}
											<span>
												{chat.title}
											</span>
										</a>
									{/snippet}
								</Sidebar.MenuButton>
								<Sidebar.MenuAction
									showOnHover
									class="top-1/2"
									onclick={() => {
										selectedChatId = chat.id
										openDeleteChatDialog = true
									}}>
									<XIcon />
									<span class="sr-only">Delete</span>
								</Sidebar.MenuAction>
							</Sidebar.MenuItem>
						{/each}
					</Sidebar.Menu>
				{/if}
			{/each}
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
							<span>{m.new_chat()}</span>
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
						class="max-h-screen w-[--bits-dropdown-menu-anchor-width] min-w-56 overflow-y-scroll rounded-lg"
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

<Dialog.Root bind:open={openDeleteChatDialog}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{m['are_you_absolutely_sure?']()}</Dialog.Title>
			<Dialog.Description>
				{m.delete_chat_message()}
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button
				variant="outline"
				onclick={() => (openDeleteChatDialog = false)}>
				{m.cancel()}
			</Button>
			<Button
				onclick={() => {
					if (selectedChatId) {
						chats.deleteChats(selectedChatId)
					}
					openDeleteChatDialog = false
					selectedChatId = ''
				}}>
				{m.delete()}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
