<script lang="ts">
	import { Input } from '$lib/components/ui/input'
	import { Label } from '$lib/components/ui/label/index.js'
	import { Checkbox } from '$lib/components/ui/checkbox/index.js'
	import * as Dialog from '$lib/components/ui/dialog/index.js'
	import { Button, buttonVariants } from '$lib/components/ui/button'
	import { PenBoxIcon } from '@lucide/svelte'
	import * as Select from '$lib/components/ui/select/index.js'
	import { m } from '$lib/paraglide/messages'

	import OpenaiIcon from '$lib/icons/openai-icon.svelte'
	import GoogleIcon from '$lib/icons/google-icon.svelte'
	import AnthropicIcon from '$lib/icons/anthropic-icon.svelte'
	import XaiIcon from '$lib/icons/xai-icon.svelte'
	import OpenRouterIcon from '$lib/icons/open-router-icon.svelte'
	import MistralIcon from '$lib/icons/mistral-icon.svelte'
	import { toast } from 'svelte-sonner'
	import type { Model } from '@kon.chat/backend'
	import { useModels } from '$lib/states/models.svelte'
	import { client } from '$lib/fetch'

	let {
		model,
		getModels,
	}: {
		model: Model
		getModels: () => Promise<void>
	} = $props()


	let modelState = useModels()

	const providers = [
		{ value: 'openai', label: 'Open AI', icon: OpenaiIcon },
		{ value: 'google', label: 'Google', icon: GoogleIcon },
		{ value: 'anthropic', label: 'Anthropic', icon: AnthropicIcon },
		{ value: 'xai', label: 'xAI', icon: XaiIcon },
		{
			value: 'open_router',
			label: 'Open Router',
			icon: OpenRouterIcon,
		},
	] as const

	const triggerContent = $derived(
		providers.find((f) => f.value === selectedProvider) ?? {
			icon: undefined,
			label: m['settings.model.select_a_provider'](),
		},
	)

	let editModelDialogOpen = $state(false)
	let selectedProvider = $state(model.provider)
	let modelID = $state(model.model)
	let image = $state(model.image)
	let file = $state(model.file)
	let fast = $state(model.fast)
	let reasoning = $state(model.reasoning)
	let searchGrounding = $state(model.searchGrounding)

	const submit = async () => {
		const response = await client.model[':model_id'].$put({
			param: {
				model_id: model.id,
			},
			json: {
				model: modelID,
				provider: selectedProvider as any,
				image,
				file,
				fast,
				reasoning,
				searchGrounding,
			},
		})

		if (!response.ok) {
			return
		}

		toast.success(m['settings.model.model_updated']())
		editModelDialogOpen = false
		getModels()

		modelState.getModels()
	}
</script>

<Dialog.Root bind:open={editModelDialogOpen}>
	<Dialog.Trigger class={buttonVariants({ variant: 'secondary' })}>
		<PenBoxIcon />
	</Dialog.Trigger>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>
				{m['settings.model.edit_a_model']()}
			</Dialog.Title>
			<Dialog.Description>
				{m['settings.model.edit_a_model_description']()}
			</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="provider" class="text-right">
					{m['settings.model.provider']()}
				</Label>
				<Select.Root
					type="single"
					name="provider"
					bind:value={selectedProvider}>
					<Select.Trigger class="w-[180px]">
						<div class="flex items-center gap-2">
							{#if triggerContent.icon}
								<triggerContent.icon />
							{/if}
							{triggerContent.label}
						</div>
					</Select.Trigger>
					<Select.Content>
						<Select.Group>
							<Select.Label>
								{m['settings.model.provider']()}
							</Select.Label>
							{#each providers as provider (provider.value)}
								<Select.Item
									value={provider.value}
									label={provider.label}>
									<provider.icon />
									{provider.label}
								</Select.Item>
							{/each}
						</Select.Group>
					</Select.Content>
				</Select.Root>
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="model">
					{m['settings.model.model']()}
				</Label>
				<Input
					id="model"
					bind:value={modelID}
					class="col-span-3"
					placeholder="gpt-4.1-nano" />
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<Label>
					{m['settings.model.capabilities.capabilities']()}
				</Label>
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<Checkbox
					id="image"
					bind:checked={image}
					class="col-span-1" />
				<Label for="image" class="text-muted-foreground col-span-3">
					{m['settings.model.capabilities.image']()}
				</Label>
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<Checkbox id="file" bind:checked={file} class="col-span-1" />
				<Label for="file" class="text-muted-foreground col-span-3">
					{m['settings.model.capabilities.file']()}
				</Label>
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<Checkbox id="fast" bind:checked={fast} class="col-span-1" />
				<Label for="fast" class="text-muted-foreground col-span-3">
					{m['settings.model.capabilities.fast']()}
				</Label>
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<Checkbox
					id="reasoning"
					bind:checked={reasoning}
					class="col-span-1" />
				<Label
					for="reasoning"
					class="text-muted-foreground col-span-3">
					{m['settings.model.capabilities.reasoning']()}
				</Label>
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<Checkbox
					id="search_grounding"
					bind:checked={searchGrounding}
					class="col-span-1" />
				<Label
					for="search_grounding"
					class="text-muted-foreground col-span-3">
					{m['settings.model.capabilities.searchGrounding']()}
				</Label>
			</div>
		</div>
		<Dialog.Footer>
			<Button onclick={submit} variant={'secondary'}>
				{m['settings.model.update_model']()}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
