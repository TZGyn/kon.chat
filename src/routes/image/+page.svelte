<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton'
	import * as Card from '$lib/components/ui/card/index.js'
	import { Textarea } from '$lib/components/ui/textarea'
	import * as Select from '$lib/components/ui/select/index.js'
	import { Label } from '$lib/components/ui/label'
	import { AspectRatio } from '$lib/components/ui/aspect-ratio'
	import { customFetch, customFetchRaw } from '$lib/fetch'
	import { Button } from '$lib/components/ui/button'
	import { Loader2Icon, XIcon } from 'lucide-svelte'
	import { toast } from 'svelte-sonner'
	import {
		FileDropZone,
		type FileDropZoneProps,
	} from '$lib/components/ui/file-drop-zone'

	const aspect_ratios = [
		{ value: '1:1', label: '1:1' },
		{ value: '3:4', label: '3:4' },
		{ value: '4:3', label: '4:3' },
		{ value: '9:16', label: '9:16' },
		{ value: '16:9', label: '16:9' },
	] as const

	let isSubmitting = $state(false)

	let selected_aspect_ratio =
		$state<(typeof aspect_ratios)[number]['value']>('1:1')
	let generated_images = $state<
		{
			base64Data: string
			mimeType: 'image/png'
		}[]
	>([])

	const triggerContent = $derived(
		aspect_ratios.find((f) => f.value === selected_aspect_ratio)
			?.label ?? 'Select an aspect ratio',
	)

	let count = $state(1)
	let prompt = $state('')
	let negative_prompt = $state('')
	let selected_image = $state<{
		base64Data: string
		mimeType: 'image/png'
	}>()

	const submit = async ({
		prompt,
		count,
		negative_prompt,
		aspect_ratio,
	}: {
		prompt: string
		negative_prompt: string
		count: number
		aspect_ratio: (typeof aspect_ratios)[number]['value']
	}) => {
		isSubmitting = true
		const url = file ? '/image/imagen/edit' : '/image/imagen/generate'
		let payload
		if (file) {
			const formdata = new FormData()
			console.log(file)
			formdata.append('file', file)
			formdata.append('prompt', prompt)
			formdata.append('negative_prompt', negative_prompt)
			formdata.append('count', count.toString())
			formdata.append('aspect_ratio', aspect_ratio)
			formdata.append('model', 'imagen-3.0-generate-001')
			payload = formdata
		} else {
			payload = JSON.stringify({
				prompt,
				negative_prompt,
				count,
				aspect_ratio,
				model: 'imagen-3.0-generate-001',
			})
		}

		let headers
		if (file) {
			headers = {}
		} else {
			headers = {
				'Content-Type': 'application/json',
			}
		}
		const response = await customFetchRaw(url, {
			method: 'POST',
			headers: { ...headers },
			body: payload,
		})

		if (response.status === 401) {
			toast.error('You must be logged in to use this feature')
			isSubmitting = false
			return
		}

		if (response.status !== 200) {
			toast.error('Unexpected Error Occurred')
			isSubmitting = false
			return
		}

		if (
			response.headers.get('Content-Type') ===
			'text/plain; charset=UTF-8'
		) {
			toast.error(await response.text())
			isSubmitting = false
			return
		}

		const body = (await response.json()) as {
			images: {
				base64Data: string
				mimeType: 'image/png'
			}[]
		}

		generated_images = body.images
		selected_image = generated_images[0]
		isSubmitting = false
	}

	let file = $state<File>()

	const onUpload: FileDropZoneProps['onUpload'] = async (
		uploadedFiles,
	) => {
		// we use set instead of an assignment since it accepts a File[]
		file = uploadedFiles[0]
	}
</script>

<div
	class="flex h-screen flex-1 flex-col-reverse items-center justify-center overflow-hidden lg:flex-row">
	<div
		class="flex w-full flex-1 flex-col-reverse gap-4 overflow-scroll p-6 lg:h-auto lg:w-2/5 lg:flex-none lg:flex-col">
		<div class="flex flex-1 flex-col gap-4">
			<div class="flex flex-col gap-2">
				<Label for="prompt">Prompt (max 1920 characters)</Label>
				<div class="relative">
					<Textarea
						id="prompt"
						placeholder={'Prompt'}
						maxlength={1920}
						bind:value={prompt}>
					</Textarea>
					<div
						class="text-muted-foreground absolute bottom-2 right-2 text-xs">
						{prompt.length}/1920
					</div>
				</div>
			</div>
			<div class="flex flex-col gap-2">
				<Label for="negative_prompt">
					Negative Prompt (max 1920 characters)
				</Label>
				<div class="relative">
					<Textarea
						id="negative_prompt"
						placeholder={'Negative Prompt'}
						maxlength={1920}
						bind:value={negative_prompt} />
					<div
						class="text-muted-foreground absolute bottom-2 right-2 text-xs">
						{negative_prompt.length}/1920
					</div>
				</div>
			</div>
			<div class="flex items-center gap-2">
				<div class="flex w-full flex-col gap-2">
					<Label for="count">Count</Label>
					<Select.Root
						type="single"
						name="count"
						bind:value={
							() => count.toString(),
							(value) => (count = parseInt(value))
						}>
						<Select.Trigger id="count" class="w-full">
							{count}
						</Select.Trigger>
						<Select.Content>
							<Select.Group>
								{#each [1, 2, 3, 4] as count, index}
									<Select.Item
										value={count.toString()}
										label={count.toString()}>
										{count}
									</Select.Item>
								{/each}
							</Select.Group>
						</Select.Content>
					</Select.Root>
				</div>
				<div class="flex w-full flex-col gap-2">
					<Label for="aspect_ratio">Aspect Ratio</Label>
					<Select.Root
						type="single"
						name="aspect_ratio"
						bind:value={selected_aspect_ratio}>
						<Select.Trigger id="aspect_ratio" class="w-full">
							{triggerContent}
						</Select.Trigger>
						<Select.Content>
							<Select.Group>
								{#each aspect_ratios as ratio (ratio.value)}
									<Select.Item
										value={ratio.value}
										label={ratio.label}>
										{ratio.label}
									</Select.Item>
								{/each}
							</Select.Group>
						</Select.Content>
					</Select.Root>
				</div>
			</div>
		</div>
		{#if file}
			<div
				class="relative flex min-h-32 items-center justify-center rounded border">
				<img src={URL.createObjectURL(file)} alt={file.name} />
				<Button
					variant="outline"
					size="icon"
					class="absolute right-2 top-2"
					onclick={() => {
						file = undefined
					}}>
					<XIcon />
				</Button>
			</div>
		{:else}
			<FileDropZone
				accept="image/jpg,image/jpeg,image/png"
				maxFiles={1}
				maxFileSize={4_000_000}
				{onUpload} />
		{/if}
		<div class="flex w-full">
			<Button
				onclick={() =>
					submit({
						count,
						negative_prompt,
						prompt,
						aspect_ratio: selected_aspect_ratio,
					})}
				disabled={isSubmitting}
				class="min-h-10 w-full">
				{#if isSubmitting}
					<Loader2Icon class="animate-spin" />
				{/if}
				Submit
			</Button>
		</div>
	</div>
	<div
		class="flex h-fit w-full flex-col items-center justify-center overflow-hidden border p-6 lg:h-full lg:flex-1">
		<div class="flex flex-row items-center gap-4 lg:flex-col">
			<div class="flex flex-col items-center gap-4">
				{#if selected_image}
					<img
						class="h-64 lg:h-96"
						src={`data:image/png;base64,${selected_image.base64Data}`}
						alt="selected_image" />
				{:else}
					<div class="bg-muted aspect-square w-64 rounded lg:w-96">
					</div>
				{/if}
				{#if generated_images.length > 0}
					<div class="flex items-center gap-2">
						<Button
							variant="outline"
							onclick={() => {
								if (!selected_image) {
									toast.error('Select an image first')
									return
								}
								const link = document.createElement('a')
								link.href = `data:image/png;base64,${selected_image.base64Data}`
								link.download = 'image.png'
								link.click()
							}}>
							Download
						</Button>
						<!-- <Button variant="outline">Download All</Button> -->
					</div>
				{/if}
			</div>
			<div
				class="flex max-w-96 flex-col flex-wrap justify-center gap-4 lg:flex-row">
				{#if generated_images.length > 0}
					<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					{#each generated_images as image, index}
						<img
							class="h-16 hover:cursor-pointer"
							onclick={() => (selected_image = image)}
							src={`data:image/png;base64,${image.base64Data}`}
							alt={`generated_image_${index}`} />
					{/each}
				{:else}
					<Card.Root>
						<Card.Content
							class="flex aspect-square items-center justify-center p-6">
						</Card.Content>
					</Card.Root>
					<Card.Root>
						<Card.Content
							class="flex aspect-square items-center justify-center p-6">
						</Card.Content>
					</Card.Root>
					<Card.Root>
						<Card.Content
							class="flex aspect-square items-center justify-center p-6">
						</Card.Content>
					</Card.Root>
					<Card.Root>
						<Card.Content
							class="flex aspect-square items-center justify-center p-6">
						</Card.Content>
					</Card.Root>
				{/if}
			</div>
		</div>
		<div></div>
	</div>
</div>
