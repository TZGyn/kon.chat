<script lang="ts">
	import { Button } from '$lib/components/ui/button'
	import { Input } from '$lib/components/ui/input'
	import * as m from '$lib/paraglide/messages'
	import { Label } from '$lib/components/ui/label'
	import { makeClient } from '$api/api-client'
	import { onMount } from 'svelte'
	import OpenRouterIcon from '$lib/icons/open-router-icon.svelte'
	import AnthropicIcon from '$lib/icons/anthropic-icon.svelte'
	import OpenaiIcon from '$lib/icons/openai-icon.svelte'
	import GoogleIcon from '$lib/icons/google-icon.svelte'
	import { useSettings } from '$lib/states/settings.svelte'

	const client = makeClient(fetch)

	const settings = useSettings()

	let openAIKey = $derived(settings.settings.openAIApiKey)
	let anthropicKey = $derived(settings.settings.claudeApiKey)
	let googleKey = $derived(settings.settings.geminiApiKey)
	let openRouterKey = $derived(settings.settings.openRouterApiKey)
</script>

<div class="flex flex-col gap-2">
	<div class="flex flex-col gap-4">
		<div class="flex flex-col gap-2">
			<Label for="openai_key" class="[&_svg]:size-4">
				<OpenaiIcon />
				{m['settings.keys.provider_api_key']({ provider: 'OpenAI' })}
				<span class="text-muted-foreground">
					({m['settings.keys.optional']()})
				</span>
			</Label>
			<Input
				id="openai_key"
				placeholder={m['settings.keys.enter_api_key']({
					provider: 'OpenAI',
				})}
				bind:value={openAIKey} />
		</div>
		<div class="flex flex-col gap-2">
			<Label for="anthropic_key" class="[&_svg]:size-4">
				<AnthropicIcon />
				{m['settings.keys.provider_api_key']({
					provider: 'Anthropic',
				})}
				<span class="text-muted-foreground">
					({m['settings.keys.optional']()})
				</span>
			</Label>
			<Input
				id="anthropic_key"
				placeholder={m['settings.keys.enter_api_key']({
					provider: 'Anthropic',
				})}
				bind:value={anthropicKey} />
		</div>
		<div class="flex flex-col gap-2">
			<Label for="google_key" class="[&_svg]:size-4">
				<GoogleIcon />
				{m['settings.keys.provider_api_key']({
					provider: 'Google',
				})}
				<span class="text-muted-foreground">
					({m['settings.keys.optional']()})
				</span>
			</Label>
			<Input
				id="google_key"
				placeholder={m['settings.keys.enter_api_key']({
					provider: 'Google',
				})}
				bind:value={googleKey} />
		</div>
		<div class="flex flex-col gap-2">
			<Label for="open_router_key" class="[&_svg]:size-4">
				<OpenRouterIcon />
				{m['settings.keys.provider_api_key']({
					provider: 'Open Router',
				})}
				<span class="text-muted-foreground">
					({m['settings.keys.optional']()})
				</span>
			</Label>
			<Input
				id="open_router_key"
				placeholder={m['settings.keys.enter_api_key']({
					provider: 'Open Router',
				})}
				bind:value={openRouterKey} />
		</div>
	</div>
	<div class="flex w-full flex-col items-end">
		<Button
			onclick={async () => {
				settings.update({
					claudeApiKey: anthropicKey,
					geminiApiKey: googleKey,
					openRouterApiKey: openRouterKey,
					openAIApiKey: openAIKey,
				})
			}}
			class=""
			variant="secondary">
			{m['settings.keys.update_api_keys']()}
		</Button>
	</div>
</div>
