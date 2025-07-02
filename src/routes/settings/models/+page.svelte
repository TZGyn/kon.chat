<script lang="ts">
	import { Input } from '$lib/components/ui/input'
	import { Label } from '$lib/components/ui/label/index.js'
	import * as Dialog from '$lib/components/ui/dialog/index.js'
	import { Button, buttonVariants } from '$lib/components/ui/button'
	import { PlusIcon, TrashIcon } from '@lucide/svelte'
	import * as Card from '$lib/components/ui/card/index.js'
	import * as Select from '$lib/components/ui/select/index.js'
	import { makeClient } from '$api/api-client'
	import type { Model } from '$api/db/type'
	import OpenaiIcon from '$lib/icons/openai-icon.svelte'
	import GoogleIcon from '$lib/icons/google-icon.svelte'
	import AnthropicIcon from '$lib/icons/anthropic-icon.svelte'
	import XaiIcon from '$lib/icons/xai-icon.svelte'
	import OpenRouterIcon from '$lib/icons/open-router-icon.svelte'
	import { onMount } from 'svelte'
	import { toast } from 'svelte-sonner'
	import MistralIcon from '$lib/icons/mistral-icon.svelte'
	import GroqIcon from '$lib/icons/groq-icon.svelte'
	import { m } from '$lib/paraglide/messages'

	const client = makeClient(fetch)

	let modelSearch = $state('')

	let models = $state<Model[]>([])

	const getModels = async () => {
		const response = await client.model.$get()

		if (response.status !== 200) return
		const data = await response.json()

		models = data.models
	}

	onMount(() => {
		getModels()
	})

	const providers = [
		{ value: 'openai', label: 'Open AI', icon: OpenaiIcon },
		{ value: 'gemini', label: 'Gemini', icon: GoogleIcon },
		{ value: 'claude', label: 'Claude', icon: AnthropicIcon },
		{ value: 'xai', label: 'xAI', icon: XaiIcon },
		{
			value: 'open_router',
			label: 'Open Router',
			icon: OpenRouterIcon,
		},
	] as const

	let addModelDialogOpen = $state(false)
	let selectedProvider = $state('')
	let modelID = $state('')

	const triggerContent = $derived(
		providers.find((f) => f.value === selectedProvider) ?? {
			icon: undefined,
			label: m['settings.model.select_a_provider'](),
		},
	)

	const submit = async () => {
		const response = await client.model.$post({
			json: {
				model: modelID,
				provider: selectedProvider as any,
			},
		})

		if (!response.ok) {
			return
		}

		toast.success(m['settings.model.model_added']())
		addModelDialogOpen = false
		getModels()
	}

	const deleteModel = async (modelId: string) => {
		const response = await client.model[':model_id'].$delete({
			param: {
				model_id: modelId,
			},
		})

		if (!response.ok) {
			toast.error(m['settings.model.model_deletion_failed']())
			return
		}

		toast.success(m['settings.model.model_deleted']())
		getModels()
	}
</script>

<div class="flex items-center gap-2">
	<Input placeholder="search models..." bind:value={modelSearch} />
	<Dialog.Root bind:open={addModelDialogOpen}>
		<Dialog.Trigger class={buttonVariants({ variant: 'secondary' })}>
			<PlusIcon />
			{m['settings.model.add_model']()}
		</Dialog.Trigger>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>
					{m['settings.model.add_a_new_model']()}
				</Dialog.Title>
				<Dialog.Description>
					{m['settings.model.add_a_new_model_description']()}
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
					<Label for="model" class="text-right">
						{m['settings.model.model']()}
					</Label>
					<Input
						id="model"
						bind:value={modelID}
						class="col-span-3"
						placeholder="gpt-4.1-nano" />
				</div>
			</div>
			<Dialog.Footer>
				<Button onclick={submit} variant={'secondary'}>
					{m['settings.model.add_model']()}
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
</div>
<div class="flex flex-col gap-2 pt-4">
	{#each models as model}
		<Card.Root>
			<Card.Content>
				<div class="flex justify-between">
					<div class="flex items-center gap-4">
						{@render modelIcon(model.provider)}
						<span>{model.model}</span>
					</div>
					<div>
						<Dialog.Root>
							<Dialog.Trigger
								class={buttonVariants({ variant: 'destructive' })}>
								<TrashIcon />
							</Dialog.Trigger>
							<Dialog.Content>
								<Dialog.Header>
									<Dialog.Title>
										{m['settings.model.delete_this_model']()}
									</Dialog.Title>
									<Dialog.Description>
										{m['settings.model.remove_this_model']()}
									</Dialog.Description>
								</Dialog.Header>
								<Dialog.Footer>
									<Dialog.Close
										class={buttonVariants({ variant: 'destructive' })}
										onclick={() => deleteModel(model.id)}>
										{m['settings.model.delete']()}
									</Dialog.Close>
								</Dialog.Footer>
							</Dialog.Content>
						</Dialog.Root>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/each}
</div>

{#snippet modelIcon(provider: string)}
	{#if provider === 'google'}
		<GoogleIcon />
	{:else if provider === 'openai'}
		<OpenaiIcon />
	{:else if provider === 'groq'}
		<GroqIcon />
	{:else if provider === 'anthropic'}
		<AnthropicIcon />
	{:else if provider === 'xai'}
		<XaiIcon />
	{:else if provider === 'mistral'}
		<MistralIcon />
	{:else if provider === 'open_router'}
		<OpenRouterIcon />
	{/if}
{/snippet}
