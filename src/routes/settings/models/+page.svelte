<script lang="ts">
	import { Input } from '$lib/components/ui/input'
	import { Label } from '$lib/components/ui/label/index.js'
	import { Checkbox } from '$lib/components/ui/checkbox/index.js'
	import * as Dialog from '$lib/components/ui/dialog/index.js'
	import { Button, buttonVariants } from '$lib/components/ui/button'
	import {
		BrainIcon,
		FileTextIcon,
		ImageIcon,
		PenBoxIcon,
		PlusIcon,
		SearchIcon,
		TrashIcon,
		ZapIcon,
	} from '@lucide/svelte'
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
	import EditModelDialog from './(components)/edit-model-dialog.svelte'
	import { useModels } from '$lib/models.svelte'

	const client = makeClient(fetch)

	let modelState = useModels()

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
	let image = $state(false)
	let file = $state(false)
	let fast = $state(false)
	let reasoning = $state(false)
	let searchGrounding = $state(false)

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

		toast.success(m['settings.model.model_added']())
		addModelDialogOpen = false
		getModels()
		modelState.getModels()
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
					<Checkbox
						id="file"
						bind:checked={file}
						class="col-span-1" />
					<Label for="file" class="text-muted-foreground col-span-3">
						{m['settings.model.capabilities.file']()}
					</Label>
				</div>
				<div class="grid grid-cols-4 items-center gap-4">
					<Checkbox
						id="fast"
						bind:checked={fast}
						class="col-span-1" />
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
					<div
						class="flex items-center gap-4 [&_svg:not([class*='size-'])]:size-4">
						{@render modelIcon(model.provider)}
						<span>{model.model}</span>
					</div>
					<div
						class="flex items-center gap-2 [&_svg:not([class*='size-'])]:size-4">
						{@render modelCapabilitiesIcon({
							fast: model.fast,
							file: model.file,
							image: model.image,
							reasoning: model.reasoning,
							searchGrounding: model.searchGrounding,
						})}
					</div>
					<div class="flex items-center gap-2">
						<EditModelDialog {getModels} {model} />
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

{#snippet modelCapabilitiesIcon(capabilities: {
	fast: boolean
	reasoning: boolean
	searchGrounding: boolean
	image: boolean
	file: boolean
})}
	{#if capabilities.searchGrounding}
		<div
			class="flex items-center justify-center rounded bg-green-500/10 p-1 text-green-500 transition-colors hover:bg-green-500/20">
			<SearchIcon class="text-green-500" />
		</div>
	{/if}
	{#if capabilities.fast}
		<div
			class="flex items-center justify-center rounded bg-yellow-500/10 p-1 text-yellow-500 transition-colors hover:bg-yellow-500/20">
			<ZapIcon class="text-yellow-500" />
		</div>
	{/if}
	{#if capabilities.reasoning}
		<div
			class="flex items-center justify-center rounded bg-purple-500/10 p-1 text-purple-500 transition-colors hover:bg-purple-500/20">
			<BrainIcon class="text-purple-500" />
		</div>
	{/if}
	{#if capabilities.image}
		<div
			class="flex items-center justify-center rounded bg-blue-500/10 p-1 text-blue-500 transition-colors hover:bg-blue-500/20">
			<ImageIcon class="text-blue-500" />
		</div>
	{/if}
	{#if capabilities.file}
		<div
			class="flex items-center justify-center rounded bg-cyan-500/10 p-1 text-cyan-500 transition-colors hover:bg-cyan-500/20">
			<FileTextIcon class="text-cyan-500" />
		</div>
	{/if}
{/snippet}
