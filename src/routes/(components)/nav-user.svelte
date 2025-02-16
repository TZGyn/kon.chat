<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar/index.js'
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js'
	import * as Sidebar from '$lib/components/ui/sidebar/index.js'
	import * as Dialog from '$lib/components/ui/dialog'
	import { useSidebar } from '$lib/components/ui/sidebar/index.js'
	import { customFetch } from '$lib/fetch'
	import { Loader2Icon, LogInIcon, UserIcon } from 'lucide-svelte'
	import BadgeCheck from 'lucide-svelte/icons/badge-check'
	import Bell from 'lucide-svelte/icons/bell'
	import ChevronsUpDown from 'lucide-svelte/icons/chevrons-up-down'
	import CreditCard from 'lucide-svelte/icons/credit-card'
	import LogOut from 'lucide-svelte/icons/log-out'
	import Sparkles from 'lucide-svelte/icons/sparkles'
	import { onMount } from 'svelte'
	import { Button } from '$lib/components/ui/button'
	import { env } from '$env/dynamic/public'
	import { useUser } from '../state.svelte'

	const sidebar = useSidebar()
	const userState = useUser()
	let user = $derived(userState.user)

	onMount(() => {
		userState.getUser()
	})

	let loginDialogOpen = $state(false)

	let logoutDialogOpen = $state(false)
	let isLoggingOut = $state(false)

	const logout = async () => {
		isLoggingOut = true
		await customFetch<{}>('/auth/logout', {
			method: 'POST',
		})
		await userState.getUser()
		logoutDialogOpen = false
		isLoggingOut = false
	}
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Sidebar.MenuButton
						size="lg"
						class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						{...props}>
						<Avatar.Root class="h-8 w-8 rounded-lg">
							<Avatar.Image src={''} alt={user?.name} />
							<Avatar.Fallback class="rounded-lg">
								{user?.name || 'K'}
							</Avatar.Fallback>
						</Avatar.Root>
						<div class="grid flex-1 text-left text-sm leading-tight">
							<span class="truncate font-semibold">
								{user?.name || 'Free User'}
							</span>
							<span class="truncate text-xs">
								{user?.email || ''}
							</span>
						</div>
						<ChevronsUpDown class="ml-auto size-4" />
					</Sidebar.MenuButton>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content
				class="w-[--bits-dropdown-menu-anchor-width] min-w-56 rounded-lg"
				side={sidebar.isMobile ? 'bottom' : 'right'}
				align="end"
				sideOffset={4}>
				<DropdownMenu.Label class="p-0 font-normal">
					<div
						class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
						<Avatar.Root class="h-8 w-8 rounded-lg">
							<Avatar.Image src={''} alt={user?.name} />
							<Avatar.Fallback class="rounded-lg">
								{user?.name || 'K'}
							</Avatar.Fallback>
						</Avatar.Root>
						<div class="grid flex-1 text-left text-sm leading-tight">
							<span class="truncate font-semibold">
								{user?.name || 'Free User'}
							</span>
							<span class="truncate text-xs">
								{user?.email || ''}
							</span>
						</div>
					</div>
				</DropdownMenu.Label>
				<DropdownMenu.Separator />
				<DropdownMenu.Label class="p-0 font-normal">
					<div
						class="flex items-center gap-2 px-2 py-1.5 text-left text-sm">
						<div class="grid flex-1 text-left text-sm leading-tight">
							<span
								class="text-muted-foreground truncate text-xs font-semibold">
								Standard Chat Limit: {user
									? user.standardChatLimit + user.standardChatCredit
									: 10}
							</span>
							<span
								class="text-muted-foreground truncate text-xs font-semibold">
								Premium Chat Limit: {user
									? user.premiumChatLimit + user.premiumChatCredit
									: 0}
							</span>
							<span
								class="text-muted-foreground truncate text-xs font-semibold">
								Web Search Limit: {user
									? user.searchLimit + user.searchCredit
									: 0}
							</span>
						</div>
					</div>
				</DropdownMenu.Label>
				<DropdownMenu.Separator />
				<DropdownMenu.Group>
					<DropdownMenu.Item>
						<Sparkles />
						Upgrade to Pro
					</DropdownMenu.Item>
				</DropdownMenu.Group>
				<DropdownMenu.Separator />
				<DropdownMenu.Group>
					<DropdownMenu.Item>
						<BadgeCheck />
						Account
					</DropdownMenu.Item>
					<DropdownMenu.Item>
						<CreditCard />
						Billing
					</DropdownMenu.Item>
					<DropdownMenu.Item>
						<Bell />
						Notifications
					</DropdownMenu.Item>
				</DropdownMenu.Group>
				<DropdownMenu.Separator />
				{#if user}
					<DropdownMenu.Item
						onclick={() => (logoutDialogOpen = true)}>
						<LogOut />
						Log out
					</DropdownMenu.Item>
				{:else}
					<DropdownMenu.Item onclick={() => (loginDialogOpen = true)}>
						<LogInIcon />
						Log In
					</DropdownMenu.Item>
				{/if}
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</Sidebar.MenuItem>
</Sidebar.Menu>

<Dialog.Root bind:open={loginDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title class="text-2xl">Login</Dialog.Title>
			<Dialog.Description>
				Select Your Login/Sign up method
			</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4">
			<Button
				href={`${env.PUBLIC_API_URL}/auth/login/google?redirect=${env.PUBLIC_APP_URL + '/'}`}
				variant="outline"
				class="w-full">
				<svg
					width="256"
					height="262"
					viewBox="0 0 256 262"
					xmlns="http://www.w3.org/2000/svg"
					preserveAspectRatio="xMidYMid">
					<path
						d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
						fill="#4285F4" />
					<path
						d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
						fill="#34A853" />
					<path
						d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"
						fill="#FBBC05" />
					<path
						d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
						fill="#EB4335" />
				</svg>
				Login with Google
			</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={logoutDialogOpen}>
	<Dialog.Content>
		<Dialog.Header class="space-y-12">
			<div
				class="flex w-full flex-col items-center justify-center gap-6 pt-12">
				<div class="bg-destructive/30 w-fit rounded-full p-4">
					<UserIcon class="text-destructive" size={64} />
				</div>
			</div>
			<div class="space-y-2">
				<Dialog.Title class="text-center">Log Out?</Dialog.Title>
				<Dialog.Description class="text-center">
					You are about to log out of this account.
				</Dialog.Description>
			</div>
			<div class="flex justify-center gap-6">
				<Button
					variant="outline"
					class="w-full"
					onclick={() => {
						logoutDialogOpen = false
					}}
					disabled={isLoggingOut}>
					Cancel
				</Button>
				<Button
					variant="destructive"
					onclick={logout}
					class="flex w-full gap-2"
					disabled={isLoggingOut}>
					{#if isLoggingOut}
						<Loader2Icon class="animate-spin" />
					{/if}
					Log Out
				</Button>
			</div>
		</Dialog.Header>
	</Dialog.Content>
</Dialog.Root>
