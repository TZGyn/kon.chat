<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar/index.js'
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js'
	import * as Sidebar from '$lib/components/ui/sidebar/index.js'
	import * as Dialog from '$lib/components/ui/dialog'
	import { useSidebar } from '$lib/components/ui/sidebar/index.js'
	import {
		Loader2Icon,
		LogInIcon,
		SettingsIcon,
		UserIcon,
	} from 'lucide-svelte'
	import ChevronsUpDown from 'lucide-svelte/icons/chevrons-up-down'
	import CreditCard from 'lucide-svelte/icons/credit-card'
	import LogOut from 'lucide-svelte/icons/log-out'
	import Sparkles from 'lucide-svelte/icons/sparkles'
	import { onMount } from 'svelte'
	import { Button } from '$lib/components/ui/button'
	import { useUser } from '../state.svelte'
	import { useChats } from '../state.svelte'
	import { cn } from '$lib/utils'
	import {
		CheckIcon,
		GlobeIcon,
		MoonIcon,
		SunIcon,
	} from '@lucide/svelte'
	import { resetMode, setMode, mode } from 'mode-watcher'
	import * as m from '$lib/paraglide/messages'
	import { useLocale } from '$lib/lang.svelte'
	import { setLocale } from '$lib/paraglide/runtime'
	import { Label } from '$lib/components/ui/label/index.js'
	import { Input } from '$lib/components/ui/input/index.js'
	import { authClient } from '$lib/auth-client'
	import { toast } from 'svelte-sonner'

	const sidebar = useSidebar()
	const chats = useChats()

	let session = authClient.useSession()

	let user = $derived($session.data?.user)

	let loginDialogOpen = $derived(
		!$session.isPending && !$session.data?.user,
	)

	let logoutDialogOpen = $state(false)
	let isLoggingOut = $state(false)

	const logout = async () => {
		isLoggingOut = true
		const response = await authClient.signOut()

		chats.getChats()
		logoutDialogOpen = false
		isLoggingOut = false
		localStorage.clear()
	}

	const locale = useLocale()

	const lang = {
		en: 'English',
		es: 'Español',
		zh: '中文',
	} as const

	let isSignUp = $state(false)

	let name = $state('')
	let email = $state('')
	let password = $state('')
	let passwordConfirm = $state('')
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Sidebar.MenuButton
						size="lg"
						{...props}
						class={cn(
							'data-[state=open]:bg-sidebar-accent bg-popover data-[state=open]:text-sidebar-accent-foreground hover:cursor-pointer',
						)}
						variant="outline">
						<Avatar.Root
							class={cn(
								'rounded-lg',
								sidebar.open ? 'h-8 w-8' : 'h-4 w-4',
							)}>
							<Avatar.Image src={user?.image} alt={user?.name} />
							<Avatar.Fallback class="rounded-lg">
								{user?.name[0] || 'K'}
							</Avatar.Fallback>
						</Avatar.Root>
						<div class="grid flex-1 text-left text-sm leading-tight">
							<span class="truncate font-semibold">
								{user?.name || ''}
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
							<Avatar.Image src={''} alt={user?.name || ''} />
							<Avatar.Fallback class="rounded-lg">
								{user?.name[0] || 'K'}
							</Avatar.Fallback>
						</Avatar.Root>
						<div class="grid flex-1 text-left text-sm leading-tight">
							<span class="truncate font-semibold">
								{user?.name || ''}
							</span>
							<span class="truncate text-xs">
								{user?.email || ''}
							</span>
						</div>
					</div>
				</DropdownMenu.Label>
				<DropdownMenu.Separator />

				<DropdownMenu.Group>
					<DropdownMenu.Root>
						<DropdownMenu.SubTrigger>
							<SunIcon
								class="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
							<MoonIcon
								class="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
							{m[mode.current || 'dark']()}
							<span class="sr-only">Toggle theme</span>
						</DropdownMenu.SubTrigger>
						<DropdownMenu.SubContent align="end">
							<DropdownMenu.Item onclick={() => setMode('light')}>
								{m.light()}
							</DropdownMenu.Item>
							<DropdownMenu.Item onclick={() => setMode('dark')}>
								{m.dark()}
							</DropdownMenu.Item>
							<DropdownMenu.Item onclick={() => resetMode()}>
								{m.system()}
							</DropdownMenu.Item>
						</DropdownMenu.SubContent>
					</DropdownMenu.Root>
					<DropdownMenu.Root>
						<DropdownMenu.SubTrigger>
							<GlobeIcon class="h-[1.2rem] w-[1.2rem]" />
							{lang[locale.lang]}
							<span class="sr-only">Toggle theme</span>
						</DropdownMenu.SubTrigger>
						<DropdownMenu.SubContent align="end">
							<DropdownMenu.Item
								onclick={() => {
									setLocale('en', { reload: false })
									locale.setLocale('en')
								}}>
								{#if locale.lang === 'en'}
									<CheckIcon />
								{/if}
								{lang['en']}
							</DropdownMenu.Item>
							<DropdownMenu.Item
								onclick={() => {
									setLocale('es', { reload: false })
									locale.setLocale('es')
								}}>
								{#if locale.lang === 'es'}
									<CheckIcon />
								{/if}
								{lang['es']}
							</DropdownMenu.Item>
							<DropdownMenu.Item
								onclick={() => {
									setLocale('zh', { reload: false })
									locale.setLocale('zh')
								}}>
								{#if locale.lang === 'zh'}
									<CheckIcon />
								{/if}
								{lang['zh']}
							</DropdownMenu.Item>
						</DropdownMenu.SubContent>
					</DropdownMenu.Root>
					<a href={'/settings'} data-sveltekit-preload-code="eager">
						<DropdownMenu.Item>
							<SettingsIcon />
							{m['settings.settings']()}
						</DropdownMenu.Item>
					</a>
				</DropdownMenu.Group>
				<DropdownMenu.Separator />
				{#if user?.email}
					<DropdownMenu.Item
						onclick={() => (logoutDialogOpen = true)}>
						<LogOut />
						{m.log_out()}
					</DropdownMenu.Item>
				{:else}
					<DropdownMenu.Item onclick={() => (loginDialogOpen = true)}>
						<LogInIcon />
						{m.log_in()}
					</DropdownMenu.Item>
				{/if}
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</Sidebar.MenuItem>
</Sidebar.Menu>

<Dialog.Root
	bind:open={loginDialogOpen}
	onOpenChange={(value) => {
		if (!$session.data?.user) loginDialogOpen = true
	}}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title class="text-2xl">Login/Signup</Dialog.Title>
			<Dialog.Description>
				Sign up/in using email or OAuth
			</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4">
			<Button
				onclick={() => {
					authClient.signIn.social({
						provider: 'github',
					})
				}}
				variant="outline"
				class="w-full">
				<svg
					viewBox="0 0 256 250"
					width="256"
					height="250"
					fill="#fff"
					xmlns="http://www.w3.org/2000/svg"
					preserveAspectRatio="xMidYMid">
					<path
						d="M128.001 0C57.317 0 0 57.307 0 128.001c0 56.554 36.676 104.535 87.535 121.46 6.397 1.185 8.746-2.777 8.746-6.158 0-3.052-.12-13.135-.174-23.83-35.61 7.742-43.124-15.103-43.124-15.103-5.823-14.795-14.213-18.73-14.213-18.73-11.613-7.944.876-7.78.876-7.78 12.853.902 19.621 13.19 19.621 13.19 11.417 19.568 29.945 13.911 37.249 10.64 1.149-8.272 4.466-13.92 8.127-17.116-28.431-3.236-58.318-14.212-58.318-63.258 0-13.975 5-25.394 13.188-34.358-1.329-3.224-5.71-16.242 1.24-33.874 0 0 10.749-3.44 35.21 13.121 10.21-2.836 21.16-4.258 32.038-4.307 10.878.049 21.837 1.47 32.066 4.307 24.431-16.56 35.165-13.12 35.165-13.12 6.967 17.63 2.584 30.65 1.255 33.873 8.207 8.964 13.173 20.383 13.173 34.358 0 49.163-29.944 59.988-58.447 63.157 4.591 3.972 8.682 11.762 8.682 23.704 0 17.126-.148 30.91-.148 35.126 0 3.407 2.304 7.398 8.792 6.14C219.37 232.5 256 184.537 256 128.002 256 57.307 198.691 0 128.001 0Zm-80.06 182.34c-.282.636-1.283.827-2.194.39-.929-.417-1.45-1.284-1.15-1.922.276-.655 1.279-.838 2.205-.399.93.418 1.46 1.293 1.139 1.931Zm6.296 5.618c-.61.566-1.804.303-2.614-.591-.837-.892-.994-2.086-.375-2.66.63-.566 1.787-.301 2.626.591.838.903 1 2.088.363 2.66Zm4.32 7.188c-.785.545-2.067.034-2.86-1.104-.784-1.138-.784-2.503.017-3.05.795-.547 2.058-.055 2.861 1.075.782 1.157.782 2.522-.019 3.08Zm7.304 8.325c-.701.774-2.196.566-3.29-.49-1.119-1.032-1.43-2.496-.726-3.27.71-.776 2.213-.558 3.315.49 1.11 1.03 1.45 2.505.701 3.27Zm9.442 2.81c-.31 1.003-1.75 1.459-3.199 1.033-1.448-.439-2.395-1.613-2.103-2.626.301-1.01 1.747-1.484 3.207-1.028 1.446.436 2.396 1.602 2.095 2.622Zm10.744 1.193c.036 1.055-1.193 1.93-2.715 1.95-1.53.034-2.769-.82-2.786-1.86 0-1.065 1.202-1.932 2.733-1.958 1.522-.03 2.768.818 2.768 1.868Zm10.555-.405c.182 1.03-.875 2.088-2.387 2.37-1.485.271-2.861-.365-3.05-1.386-.184-1.056.893-2.114 2.376-2.387 1.514-.263 2.868.356 3.061 1.403Z" />
				</svg>
				Login with Github
			</Button>
			<Button
				onclick={() => {
					authClient.signIn.social({
						provider: 'google',
					})
				}}
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
			<div
				class="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
				<span
					class="bg-background text-muted-foreground relative z-10 px-2">
					Or continue with
				</span>
			</div>
			<div class="flex flex-col gap-6">
				{#if isSignUp}
					<div class="grid gap-2">
						<Label for="name">Name</Label>
						<Input
							id="name"
							type="name"
							placeholder="Kon"
							bind:value={name} />
					</div>
				{/if}

				<div class="grid gap-2">
					<Label for="email">Email</Label>
					<Input
						id="email"
						type="email"
						placeholder="konchat@example.com"
						bind:value={email} />
				</div>
				<div class="grid gap-2">
					<div class="flex items-center">
						<Label for="password">Password</Label>
						<!-- <a
								href="##"
								class="ml-auto inline-block text-sm underline-offset-4 hover:underline">
								Forgot your password?
							</a> -->
					</div>
					<Input
						id="password"
						type="password"
						placeholder="********"
						bind:value={password} />
				</div>

				{#if isSignUp}
					<div class="grid gap-2">
						<Label for="password_confirm">Password Confirm</Label>
						<Input
							id="password_confirm"
							type="password"
							placeholder="********"
							bind:value={passwordConfirm} />
					</div>
				{/if}
				{#if isSignUp}
					<Button
						onclick={() => {
							if (password !== passwordConfirm) {
								toast.error(m.password_not_match())
								return
							}
							authClient.signUp.email({
								email,
								password,
								name,
							})
						}}
						class="w-full"
						variant="secondary">
						Sign Up
					</Button>
				{:else}
					<Button
						onclick={() => {
							authClient.signIn.email({
								email,
								password,
							})
						}}
						class="w-full"
						variant="secondary">
						Login
					</Button>
				{/if}
			</div>
			{#if isSignUp}
				<div class="text-center text-sm">
					Have an account?
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<span
						onclick={(event) => {
							event.preventDefault()
							isSignUp = false
						}}
						class="underline underline-offset-4">
						Login
					</span>
				</div>
			{:else}
				<div class="text-center text-sm">
					Don&apos;t have an account?
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<span
						onclick={(event) => {
							event.preventDefault()
							isSignUp = true
						}}
						class="underline underline-offset-4">
						Sign Up
					</span>
				</div>
			{/if}
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
					class="flex-1"
					onclick={() => {
						logoutDialogOpen = false
					}}
					disabled={isLoggingOut}>
					Cancel
				</Button>
				<Button
					variant="destructive"
					onclick={logout}
					class="flex flex-1 gap-2"
					disabled={isLoggingOut}>
					{#if isLoggingOut}
						<Loader2Icon class="animate-spin" />
					{/if}
					{m.log_out()}
				</Button>
			</div>
		</Dialog.Header>
	</Dialog.Content>
</Dialog.Root>
