<script lang="ts">
	import { authClient } from '$lib/auth-client'
	import { useSettings } from '$lib/states/settings.svelte'

	import { Button } from '$lib/components/ui/button'
	import { Label } from '$lib/components/ui/label/index.js'
	import { Input } from '$lib/components/ui/input/index.js'
	import * as Dialog from '$lib/components/ui/dialog'
	import { PUBLIC_APP_URL } from '$env/static/public'
	import OpenaiIcon from '$lib/icons/openai-icon.svelte'
	import { m } from '$lib/paraglide/messages'

	let session = authClient.useSession()

	const settings = useSettings()

	let user = $derived($session.data?.user)

	let dialogOpen = $derived(!!user && !settings.settings.openAIApiKey)

	let apiKey = $derived(settings.settings.openAIApiKey)
</script>

<Dialog.Root
	bind:open={dialogOpen}
	onOpenChange={(value) => {
		if ($session.data?.user && !settings.settings.openAIApiKey) {
			dialogOpen = true
		}
	}}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title
				class="flex items-center gap-2 text-2xl [&_svg]:size-8">
				<OpenaiIcon />
				Open AI Key
			</Dialog.Title>
			<Dialog.Description>
				Open AI Key is required to use this service
			</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4">
			<div class="flex flex-col gap-6">
				<div class="flex flex-col gap-2">
					<Input
						id="openai_key"
						placeholder={m['settings.keys.enter_api_key']({
							provider: 'OpenAI',
						})}
						bind:value={apiKey} />
				</div>

				<Button
					onclick={() => {
						settings.update({
							openAIApiKey: apiKey,
						})
					}}
					class="w-full"
					variant="secondary">
					Submit
				</Button>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
