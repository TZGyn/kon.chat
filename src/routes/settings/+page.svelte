<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar/index.js'
	import { Button, buttonVariants } from '$lib/components/ui/button'
	import * as Dialog from '$lib/components/ui/dialog/index.js'
	import { Input } from '$lib/components/ui/input'
	import { Textarea } from '$lib/components/ui/textarea'
	import { cn } from '$lib/utils'
	import { useUser } from '../state.svelte'
	import { setLocale } from '$lib/paraglide/runtime'
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js'
	import { useLocale } from '$lib/lang.svelte'
	import { CheckIcon, Loader2Icon } from '@lucide/svelte'
	import * as m from '$lib/paraglide/messages'
	import { MoonIcon, SunIcon } from '@lucide/svelte'
	import { resetMode, setMode, mode } from 'mode-watcher'
	import { onMount } from 'svelte'
	import { customFetch } from '$lib/fetch'

	const user = useUser()

	const locale = useLocale()

	let name = $state('')
	let additional_system_prompt = $state('')

	const lang = {
		en: 'English',
		es: 'Español',
		zh: '中文',
	} as const

	onMount(() => {
		name = user.user?.name_for_llm || ''
		additional_system_prompt =
			user.user?.additional_system_prompt || ''
	})

	let isLoading = $state(false)
	const update = async () => {
		isLoading = true
		user.user = user.user
			? {
					...user.user,
					name_for_llm: name,
					additional_system_prompt: additional_system_prompt,
				}
			: null
		await customFetch<{ success: boolean }>(`/user/settings`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				name,
				additional_system_prompt,
			}),
		})
		isLoading = false
	}
</script>

<div class="flex flex-col gap-2 p-4">
	<div class="flex flex-col items-center gap-4 py-6">
		<Avatar.Root class="size-32">
			<Avatar.Image src={user.user?.avatar} alt="kon.chat" />
			<Avatar.Fallback class="text-6xl">K</Avatar.Fallback>
		</Avatar.Root>
		<span class="pb-6">{user.user?.email}</span>
		<span
			class="bg-secondary flex items-center gap-4 rounded-lg py-2 pr-2 pl-4">
			<span class="flex items-center gap-2">
				{((user.user?.credits ?? 0) +
					(user.user?.purchased_credits ?? 0)) /
					100}
				<span class="text-muted-foreground">
					{m.credits().toLocaleLowerCase()}
				</span>
			</span>
			<Button
				href="/billing/one-time"
				data-sveltekit-preload-code="eager">
				{m.add_credits()}
			</Button>
		</span>
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
		<Button onclick={update} disabled={isLoading} class="">
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
		<Dialog.Root>
			<Dialog.Trigger
				class={cn(
					buttonVariants({ variant: 'destructive' }),
					'border-destructive text-destructive hover:text-destructive-foreground w-fit border bg-transparent',
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
			</Dialog.Content>
		</Dialog.Root>
	</div>
</div>
