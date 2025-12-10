<script lang="ts">
	import { Input } from '$lib/components/ui/input'
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js'
	import {
		EllipsisVerticalIcon,
		FileTextIcon,
		Loader2Icon,
		PlusIcon,
	} from 'lucide-svelte'
	import { MediaQuery } from 'svelte/reactivity'
	import * as Dialog from '$lib/components/ui/dialog/index.js'
	import * as Drawer from '$lib/components/ui/drawer/index.js'
	import { Button } from '$lib/components/ui/button/index.js'
	import {
		FileDropZone,
		type FileDropZoneProps,
	} from '$lib/components/ui/file-drop-zone'
	import { goto, preloadCode } from '$app/navigation'
	import { onMount } from 'svelte'
	import PdfIcon from '../(icons)/PDF-icon.svelte'
	import { toast } from 'svelte-sonner'
	import { useLocalStorage } from '$lib/hooks/use-local-storage.svelte'
	import type { PDF } from '@kon.chat/backend'
	import { client } from '$lib/fetch'

	let open = $state(false)
	const isDesktop = new MediaQuery('(min-width: 768px)')

	let page = $state(0)

	let pdfs = useLocalStorage<PDF[]>('pdfs', [])

	let file = $state<File>()

	const onUpload: FileDropZoneProps['onUpload'] = async (
		uploadedFiles,
	) => {
		// we use set instead of an assignment since it accepts a File[]
		file = uploadedFiles[0]
	}

	const fetchPDFs = async () => {
		const response = await client.documents.pdf.$get()
		if (response.status === 200) {
			const data = await response.json()
			pdfs.value = data.pdfs
		}
	}

	let uploadStatus = $state<'submitting' | 'done'>('done')
	const submit = async () => {
		if (!file) {
			return
		}

		uploadStatus = 'submitting'

		const response = await client.documents.pdf.new.$post({
			form: { file: file },
		})

		uploadStatus = 'done'

		if (response.status !== 200) {
			return
		}

		const body = await response.json()

		goto(`/documents/pdf/${body.id}`)
	}

	const deletePDF = async (pdf_id: string) => {
		const prev = pdfs.value
		pdfs.value = pdfs.value.filter((pdf) => pdf.id !== pdf_id)

		const response = await client.documents.pdf[':pdf_id'].$delete({
			param: {
				pdf_id: pdf_id,
			},
		})

		const success = (await response.json()).success

		if (success) {
			toast.success('PDF Deleted')
		} else {
			pdfs.value = prev
		}
	}

	onMount(() => {
		fetchPDFs()
	})
</script>

<div class="flex flex-1 flex-col gap-4 p-8">
	<div class="flex items-center gap-2">
		<Input placeholder="search document..." />
		<Button onclick={() => (open = true)} class="min-w-fit">
			<PlusIcon />
			New PDF
		</Button>
	</div>
	<div class="flex flex-wrap gap-8">
		{#each pdfs.value as pdf}
			<a
				href={`/documents/pdf/${pdf.id}`}
				class="flex h-96 w-64 flex-col border"
				aria-label={'1'}>
				<div class="flex flex-1 items-center justify-center">
					<PdfIcon class="size-32" />
				</div>
				<div class="bg-secondary flex flex-col gap-2 p-2">
					<div
						class="overflow-hidden text-ellipsis whitespace-nowrap">
						<span>
							{pdf.name}
						</span>
					</div>
					<div class="flex items-center justify-between">
						<div
							class="text-muted-foreground flex items-center gap-2">
							<FileTextIcon class="size-4" />
							<span>
								{new Date(pdf.createdAt).toLocaleDateString()}
							</span>
						</div>
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								{#snippet child({ props })}
									<Button {...props} variant="ghost" size="icon">
										<EllipsisVerticalIcon />
									</Button>
								{/snippet}
							</DropdownMenu.Trigger>
							<DropdownMenu.Content>
								<DropdownMenu.Group>
									<DropdownMenu.Item
										class="data-[highlighted]:bg-destructive text-destructive data-[highlighted]:text-destructive-foreground"
										onclick={() => deletePDF(pdf.id)}>
										Delete
									</DropdownMenu.Item>
								</DropdownMenu.Group>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</div>
				</div>
			</a>
		{/each}
	</div>
</div>
{#if isDesktop.current}
	<Dialog.Root bind:open>
		<Dialog.Content class="sm:max-w-[425px]">
			<Dialog.Header>
				<Dialog.Title>Upload PDF</Dialog.Title>
			</Dialog.Header>
			{#if file}
				<div
					class="flex w-full flex-col items-center justify-center gap-8">
					<div class="flex flex-col rounded border">
						<div class="flex items-center justify-center p-4">
							<FileTextIcon class="size-16" />
						</div>
						<div class="bg-accent flex p-4">
							<div class="line-clamp-3">{file.name}</div>
						</div>
					</div>
					<div class="flex w-full flex-col items-center gap-4">
						<Button
							onclick={submit}
							class="flex w-full items-center gap-2">
							{#if uploadStatus === 'submitting'}
								<Loader2Icon class="animate-spin" />
							{/if}
							Upload
						</Button>
						<Button
							variant="outline"
							class="w-full"
							onclick={() => (file = undefined)}>
							Cancel
						</Button>
					</div>
				</div>
			{:else}
				<FileDropZone
					accept="application/pdf"
					maxFiles={1}
					maxFileSize={4_000_000}
					{onUpload} />
			{/if}
		</Dialog.Content>
	</Dialog.Root>
{:else}
	<Drawer.Root bind:open>
		<Drawer.Content>
			<Drawer.Header class="text-left">
				<Drawer.Title>Upload PDF</Drawer.Title>
			</Drawer.Header>
			<div class="p-4">
				{#if file}
					<div
						class="flex w-full flex-col items-center justify-center gap-8">
						<div class="flex flex-col rounded border">
							<div class="flex items-center justify-center p-4">
								<FileTextIcon class="size-16" />
							</div>
							<div class="bg-accent flex p-4">
								<div class="line-clamp-3">{file.name}</div>
							</div>
						</div>
						<div class="flex w-full flex-col items-center gap-4">
							<Button
								onclick={submit}
								class="flex w-full items-center gap-2">
								{#if uploadStatus === 'submitting'}
									<Loader2Icon class="animate-spin" />
								{/if}
								Upload
							</Button>
							<Button
								variant="outline"
								class="w-full"
								onclick={() => (file = undefined)}>
								Cancel
							</Button>
						</div>
					</div>
				{:else}
					<FileDropZone
						accept="application/pdf"
						maxFiles={1}
						maxFileSize={4_000_000}
						{onUpload} />
				{/if}
			</div>
			<!-- <Drawer.Footer class="pt-2">
				<Drawer.Close class={buttonVariants({ variant: 'outline' })}>
					Cancel
				</Drawer.Close>
			</Drawer.Footer> -->
		</Drawer.Content>
	</Drawer.Root>
{/if}
