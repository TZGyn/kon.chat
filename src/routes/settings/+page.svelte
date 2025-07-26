<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar/index.js'
	import { Button, buttonVariants } from '$lib/components/ui/button'
	import * as Dialog from '$lib/components/ui/dialog/index.js'
	import { Input } from '$lib/components/ui/input'
	import { Textarea } from '$lib/components/ui/textarea'
	import { cn } from '$lib/utils'
	import { setLocale } from '$lib/paraglide/runtime'
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js'
	import { useLocale } from '$lib/lang.svelte'
	import { CheckIcon, Loader2Icon } from '@lucide/svelte'
	import * as m from '$lib/paraglide/messages'
	import { MoonIcon, SunIcon } from '@lucide/svelte'
	import { resetMode, setMode, mode } from 'mode-watcher'
	import { makeClient } from '$api/api-client'
	import { authClient } from '$lib/auth-client'
	import { useSettings } from '$lib/states/settings.svelte'

	const settings = useSettings()
	const session = authClient.useSession()

	const locale = useLocale()

	let name = $derived(settings.settings.nameForLLM)
	let additional_system_prompt = $derived(
		settings.settings.additionalSystemPrompt,
	)

	const lang = {
		en: 'English',
		es: 'Español',
		zh: '中文',
	} as const

	let isLoading = $state(false)
	const update = async () => {
		isLoading = true

		await settings.update({
			nameForLLM: name,
			additionalSystemPrompt: additional_system_prompt,
		})

		isLoading = false
	}

	let deleteAccountDialogOpen = $state(false)
	let isDeletingAccount = $state(false)

	const deleteAccount = async () => {
		isDeletingAccount = true

		await authClient.deleteUser({})

		deleteAccountDialogOpen = false
		isDeletingAccount = false
		localStorage.clear()
	}
</script>

<div class="flex flex-col gap-2">
	<div class="flex flex-col items-center gap-4 py-6">
		<Avatar.Root class="size-32">
			<Avatar.Image src={$session.data?.user?.image} alt="kon.chat" />
			<Avatar.Fallback class="text-6xl">K</Avatar.Fallback>
		</Avatar.Root>
		<span class="pb-6">{$session.data?.user?.email}</span>
	</div>
	<div class="grid grid-cols-[auto_1fr] items-center gap-2 py-4">
		<div>{m.language()}</div>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger
				class={cn(
					buttonVariants({ variant: 'outline' }),
					'w-full max-w-[100px]',
				)}>
				{lang[locale.lang]}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content>
				<DropdownMenu.Group>
					<DropdownMenu.GroupHeading>
						{m.language()}
					</DropdownMenu.GroupHeading>
					<DropdownMenu.Separator />
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
				</DropdownMenu.Group>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
		<div>{m.theme()}</div>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger
				class={cn(
					buttonVariants({ variant: 'outline' }),
					'w-full max-w-[100px]',
				)}>
				{#if mode.current === 'dark'}
					<MoonIcon
						class="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all" />
				{:else}
					<SunIcon
						class="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all" />
				{/if}
				{m[mode.current || 'dark']()}
				<span class="sr-only">Toggle theme</span>
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end">
				<DropdownMenu.Item onclick={() => setMode('light')}>
					{m.light()}
				</DropdownMenu.Item>
				<DropdownMenu.Item onclick={() => setMode('dark')}>
					{m.dark()}
				</DropdownMenu.Item>
				<DropdownMenu.Item onclick={() => resetMode()}>
					{m.system()}
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>
	<div class="flex flex-col gap-2">
		<div>{m['settings.account.what_should_we_call_you']()}</div>
		<Input
			placeholder={m['settings.account.type_your_name_here']()}
			bind:value={name} />
	</div>
	<div class="flex flex-col gap-2">
		<div>{m['settings.account.additional_system_prompt']()}</div>
		<Textarea
			placeholder={m[
				'settings.account.your_additional_system_prompts_here'
			]()}
			bind:value={additional_system_prompt}
			class="bg-secondary" />
	</div>
	<div class="flex w-full flex-col items-end">
		<Button
			onclick={update}
			disabled={isLoading}
			class=""
			variant="secondary">
			{#if isLoading}
				<Loader2Icon class="animate-spin" />
			{/if}
			{m.update()}
		</Button>
	</div>
	<div class="flex flex-col gap-2">
		<div class="text-destructive">
			{m['settings.account.danger_zone']()}
		</div>
		<Dialog.Root bind:open={deleteAccountDialogOpen}>
			<Dialog.Trigger
				class={cn(
					buttonVariants({ variant: 'destructive' }),
					'border-destructive hover:text-destructive-foreground w-fit border bg-transparent',
				)}>
				{m['settings.account.delete_account']()}
			</Dialog.Trigger>
			<Dialog.Content>
				<Dialog.Header>
					<Dialog.Title>Are you sure absolutely sure?</Dialog.Title>
					<Dialog.Description>
						This action cannot be undone. This will permanently delete
						your account and remove your data from our servers.
					</Dialog.Description>
				</Dialog.Header>
				<Dialog.Footer>
					<Button
						variant="destructive"
						onclick={deleteAccount}
						class="flex flex-1 gap-2"
						disabled={isDeletingAccount}>
						{#if isDeletingAccount}
							<Loader2Icon class="animate-spin" />
						{/if}
						{m.delete()}
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog.Root>
	</div>
</div>
