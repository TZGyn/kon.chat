<script lang="ts">
	import { env } from '$env/dynamic/public'
	import { customFetch, customFetchRaw } from '$lib/fetch'
	import {
		FileTextIcon,
		Loader2Icon,
		RotateCwIcon,
		XIcon,
	} from 'lucide-svelte'
	import { onMount } from 'svelte'
	import { toast } from 'svelte-sonner'
	import * as m from '$lib/paraglide/messages'

	let {
		file,
		upload_url,
		url = $bindable(''),
		delete: deleteCard,
		status = $bindable(),
	}: {
		file: File
		upload_url?: string
		url?: string
		status: 'submitted' | 'uploading' | 'error' | 'ready'
		delete: () => void
	} = $props()

	let uploadProgress = $state(0)
	let uploadMax = $state(1)

	let isCancelled = $state(false)
	let isCompleted = $state(false)

	const xhr = new XMLHttpRequest()

	const upload = async () => {
		// return
		status = 'uploading'
		try {
			toast.info(`${m.uploading()}: ${file.name}`)
			const formdata = new FormData()
			formdata.append('file', file)
			const response = await customFetchRaw(
				upload_url ?? '/file-upload',
				{
					method: 'POST',
					body: formdata,
				},
			)

			if (response.status !== 200) {
				if (
					response.headers.get('Content-Type') ===
					'text/plain; charset=UTF-8'
				) {
					toast.error(await response.text())
					return
				}
				toast.error('Upload Failed')
				return
			}

			const body = (await response.json()) as { id: string }
			url = '/api/file-upload/' + body.id
			toast.success(`${m.file_uploaded()}: ${file.name}`)
			status = 'ready'
		} catch (error) {
			status = 'error'
		}
		return

		// // https://stackoverflow.com/questions/35711724/upload-progress-indicators-for-fetch
		// const success = await new Promise((resolve) => {
		// 	xhr.upload.addEventListener('progress', (event) => {
		// 		if (event.lengthComputable) {
		// 			uploadProgress = event.loaded
		// 			uploadMax = event.total
		// 		}
		// 	})
		// 	xhr.addEventListener('loadend', () => {
		// 		resolve(xhr.readyState === 4 && xhr.status === 200)
		// 	})
		// 	xhr.open('PUT', body.link, true)
		// 	xhr.setRequestHeader('Content-Type', file.type)
		// 	xhr.send(file)
		// })
		// console.log('success:', success)

		// if ((success as boolean) === true) {
		// 	isCompleted = true
		// 	setTimeout(() => {
		// 		invalidateAll()
		// 	}, 3000)
		// 	toast.success(`File Uploaded: ${file.name}`)
		// }
	}

	// $effect(() => {
	// 	if (isCompleted) {
	// 		setTimeout(() => {
	// 			deleteCard()
	// 		}, 2000)
	// 	}
	// })

	onMount(() => {
		upload()
	})
</script>

<!-- <Card.Root>
	<Card.Content class="flex items-center justify-between gap-4">
		<div class="flex w-full flex-col gap-2">
			<div>
				<span>
					{file.name}
				</span>
				<span class="text-muted-foreground">
					{byteToHumanReadable(file.size)}
				</span>
				{#if isCancelled}
					<span class="text-destructive">(Cancelled)</span>
				{:else}
					<span
						class={cn(
							'text-brand',
							uploadProgress / uploadMax === 1 && 'text-success',
						)}>
						({((uploadProgress / uploadMax) * 100).toFixed(1)} %)
					</span>
				{/if}
			</div>
			<Progress value={uploadProgress} max={uploadMax} class="h-2" />
		</div>
		{#if !isCancelled || isCompleted}
			<Button
				variant="outline"
				disabled={isCompleted}
				onclick={() => {
					xhr.abort()
					isCancelled = true
					toast.error(`Upload Cancelled: ${file.name}`)
				}}
				size="icon">
				<XIcon />
			</Button>
		{:else}
			<Button
				variant="outline"
				onclick={() => {
					upload()
					isCancelled = false
					toast.info(`Upload Retry: ${file.name}`)
				}}
				size="icon">
				<RotateCwIcon />
			</Button>
		{/if}
	</Card.Content>
</Card.Root> -->

<div
	class="bg-background group relative flex min-h-16 min-w-16 overflow-hidden rounded-lg border">
	{#if status === 'uploading'}
		<div class="flex flex-1 items-center justify-center">
			<Loader2Icon class="animate-spin" />
		</div>
	{:else if file.type.startsWith('image/')}
		{#if url}
			<img src={url} class="h-16" alt="upload" />
		{/if}
	{:else if url}
		<a
			class="flex flex-1 flex-col items-center gap-2 p-4"
			href={url}
			aria-label="doc"
			target="_blank">
			<FileTextIcon class="min-h-8" />
			<span>{file.name}</span>
		</a>
	{/if}
	<XIcon
		onclick={deleteCard}
		class="group-hover:bg-background absolute top-0 right-0 hover:cursor-pointer" />
</div>
