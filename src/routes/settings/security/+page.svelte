<script lang="ts">
	import { Button, buttonVariants } from '$lib/components/ui/button'
	import { Input } from '$lib/components/ui/input'
	import * as m from '$lib/paraglide/messages'
	import { authClient } from '$lib/auth-client'
	import { toast } from 'svelte-sonner'
	import { Label } from '$lib/components/ui/label'

	const session = authClient.useSession()

	let email = $derived($session.data?.user.email)
	let oldPassword = $state('')
	let newPassword = $state('')
</script>

<div class="flex flex-col gap-2">
	<div class="flex flex-col gap-2">
		<Label for="email">
			{m['settings.security.email']()}
			<span class="text-muted-foreground">
				({$session.data?.user.emailVerified
					? m['settings.security.verified']()
					: m['settings.security.unverified']()})
			</span>
		</Label>
		<Input
			id="email"
			placeholder={m['settings.security.type_your_new_email_here']()}
			bind:value={email} />
	</div>
	<div class="flex w-full flex-col items-end">
		<Button
			onclick={async () => {
				if (!email) {
					toast.error('')
					return
				}
				await authClient.changeEmail({
					newEmail: email,
				})
				authClient.$store.notify('$sessionSignal')
			}}
			class=""
			variant="secondary">
			{m['settings.security.update_email']()}
		</Button>
	</div>

	<div class="flex flex-col gap-2">
		<Label for="old_password">
			{m['settings.security.old_password']()}
		</Label>
		<Input
			id="old_password"
			placeholder={'********'}
			bind:value={oldPassword}
			type="password" />
	</div>
	<div class="flex flex-col gap-2">
		<Label for="new_password">
			{m['settings.security.new_password']()}
		</Label>
		<Input
			id="new_password"
			placeholder={'********'}
			bind:value={newPassword}
			type="password" />
	</div>
	<div class="flex w-full flex-col items-end">
		<Button
			onclick={async () => {
				await authClient.changePassword({
					currentPassword: oldPassword,
					newPassword: newPassword,
				})
				authClient.$store.notify('$sessionSignal')
			}}
			class=""
			variant="secondary">
			{m['settings.security.update_password']()}
		</Button>
	</div>
</div>
