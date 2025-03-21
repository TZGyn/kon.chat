<script lang="ts">
	import { replaceState } from '$app/navigation'
	import { page } from '$app/state'
	import Markdown from '$lib/components/markdown.svelte'
	import { ScrollArea } from '$lib/components/ui/scroll-area'
	import * as Tabs from '$lib/components/ui/tabs/index.js'
	import * as Avatar from '$lib/components/ui/avatar/index.js'
	import { cn } from '$lib/utils'
	import { Skeleton } from '$lib/components/ui/skeleton'
	import Chat from './(components)/chat.svelte'
	import { customFetchRaw } from '$lib/fetch'
	import { toast } from 'svelte-sonner'
	import { processDataStream } from '@ai-sdk/ui-utils'
	import { onMount } from 'svelte'
	import { UseAutoScroll } from '$lib/hooks/use-auto-scroll.svelte'

	const autoScroll = new UseAutoScroll()
	const autoScrollMarkdown = new UseAutoScroll()

	let selectedTab = $state(
		page.url.searchParams.get('tab') || 'markdown',
	)

	let status = $state<
		'loading' | 'submitted' | 'streaming' | 'ready'
	>('loading')
	let markdownStatus = $state<'loading' | 'streaming' | 'done'>()

	let url = $state('')
	let summary = $state('')
	let markdown = $state('')

	const getPDFData = async () => {
		status = 'loading'
		const response = await customFetchRaw(
			`/documents/pdf/${page.params.pdf_id}`,
		)
		if (!response.ok) {
			toast.error(await response.text())
			return
		}

		const { pdf: data } = (await response.json()) as {
			pdf: {
				type: 'pdf'
				url: string
				name: string
				id: string
				createdAt: number
				userId: string
				summary: string | null
				markdown: string | null
			}
		}

		url = data.url

		status = 'ready'
	}

	const getPDFMarkdown = async () => {
		markdownStatus = 'loading'
		const response = await customFetchRaw(
			`/documents/pdf/${page.params.pdf_id}/markdown`,
		)
		if (!response.ok) {
			toast.error(await response.text())
			return
		}

		if (response.headers.get('Content-Type') === 'application/json') {
			const { markdown: data } = (await response.json()) as {
				markdown: string
			}

			markdown = data

			markdownStatus = 'done'
			return
		}

		markdownStatus = 'streaming'

		if (!response.body) {
			throw new Error('The response body is empty.')
		}
		await processDataStream({
			stream: response.body,
			onTextPart: (value) => {
				console.log(value)
				markdown += value
			},
			onDataPart: (value) => {
				value.map((value) => {
					// @ts-ignore
					if (value.type === 'pdf_info') {
						// @ts-ignore
						const data = value.info as {
							type: 'pdf'
							url: string
							name: string
							id: string
							createdAt: number
							userId: string
							summary: null
							markdown: null
						}
						url = data.url
					}
					// @ts-ignore
					if (value.type === 'markdown-data') {
						// @ts-ignore
						markdown = value.message as string
					}
				})
			},
		})

		markdownStatus = 'done'
	}

	const getPDFSummary = async () => {
		status = 'loading'
		const response = await customFetchRaw(
			`/documents/pdf/${page.params.pdf_id}/summary`,
		)
		if (!response.ok) {
			toast.error(await response.text())
			return
		}

		if (response.headers.get('Content-Type') === 'application/json') {
			const { summary: data } = (await response.json()) as {
				summary: string
			}

			summary = data

			status = 'ready'
			return
		}

		status = 'streaming'

		if (!response.body) {
			throw new Error('The response body is empty.')
		}
		await processDataStream({
			stream: response.body,
			onTextPart: (value) => {
				summary += value
			},
			onDataPart: (value) => {
				value.map((value) => {
					// @ts-ignore
					if (value.type === 'pdf_info') {
						// @ts-ignore
						const data = value.info as {
							type: 'pdf'
							url: string
							name: string
							id: string
							createdAt: number
							userId: string
							summary: null
							markdown: null
						}
						url = data.url
					}
					// @ts-ignore
					if (value.type === 'markdown-data') {
						// @ts-ignore
						markdown = value.message as string
					}
				})
			},
		})

		status = 'ready'
	}

	onMount(async () => {
		getPDFData()
		await getPDFMarkdown()
		getPDFSummary()
	})
</script>

<div
	class="@container flex flex-1 flex-col justify-center overflow-hidden">
	<div class="@6xl:flex-row flex flex-1 flex-col overflow-hidden">
		<div class="flex flex-1 overflow-hidden">
			<iframe title="pdf" class="flex-1" src={url}></iframe>
		</div>
		<div class="flex flex-1 overflow-hidden">
			<Tabs.Root
				value={selectedTab}
				onValueChange={(value) => {
					selectedTab = value
					page.url.searchParams.set('tab', value)
					replaceState(page.url, page.state)
				}}
				class="flex flex-1 flex-col border p-4 pb-0">
				<Tabs.List class="w-fit">
					<Tabs.Trigger value="summary">Summary</Tabs.Trigger>
					<Tabs.Trigger value="markdown">Markdown</Tabs.Trigger>
					<Tabs.Trigger value="chat">Chat</Tabs.Trigger>
				</Tabs.List>
				<Tabs.Content
					value="summary"
					class="flex flex-1 overflow-hidden">
					<ScrollArea
						bind:vp={autoScroll.ref}
						class="flex flex-1 flex-col items-center">
						<div
							class="prose prose-neutral dark:prose-invert prose-p:my-0 pb-4 pt-2">
							<Markdown id="pdf-summary" content={summary} />
						</div>
						{#if status === 'loading' || status === 'streaming'}
							<div
								class={cn(
									'flex min-h-[calc(100vh-25rem)] gap-2 place-self-start',
								)}>
								<div class="group flex flex-col gap-2">
									<div class="flex items-center gap-4">
										<div
											class="ring-border flex size-8 shrink-0 items-center justify-center rounded-full bg-black ring-1">
											<div class="translate-y-px">
												<Avatar.Root class="size-4 overflow-visible">
													<Avatar.Image
														src={'/logo.png'}
														alt="favicon"
														class="size-4" />
													<Avatar.Fallback
														class="size-4 bg-opacity-0">
														<img src="/logo.png" alt="favicon" />
													</Avatar.Fallback>
												</Avatar.Root>
											</div>
										</div>
										<div class="animate-pulse">Getting Summary</div>
									</div>
								</div>
							</div>
						{/if}
					</ScrollArea>
				</Tabs.Content>
				<Tabs.Content
					value="markdown"
					class="flex flex-1 overflow-hidden">
					<ScrollArea
						bind:vp={autoScrollMarkdown.ref}
						class="flex flex-1 flex-col items-center">
						<div
							class="prose prose-neutral dark:prose-invert prose-p:my-0 pb-4 pt-2">
							<Markdown id="pdf-markdown" content={markdown} />
						</div>
						{#if markdownStatus === 'loading' || markdownStatus === 'streaming'}
							<div
								class={cn(
									'flex min-h-[calc(100vh-25rem)] gap-2 place-self-start',
								)}>
								<div class="group flex flex-col gap-2">
									<div class="flex items-center gap-4">
										<div
											class="ring-border flex size-8 shrink-0 items-center justify-center rounded-full bg-black ring-1">
											<div class="translate-y-px">
												<Avatar.Root class="size-4 overflow-visible">
													<Avatar.Image
														src={'/logo.png'}
														alt="favicon"
														class="size-4" />
													<Avatar.Fallback
														class="size-4 bg-opacity-0">
														<img src="/logo.png" alt="favicon" />
													</Avatar.Fallback>
												</Avatar.Root>
											</div>
										</div>
										<div class="animate-pulse">Getting Markdown</div>
									</div>
								</div>
							</div>
						{/if}
					</ScrollArea>
				</Tabs.Content>
				<Tabs.Content
					value="chat"
					class="flex flex-1 overflow-hidden">
					<div class="relative flex flex-1 overflow-hidden">
						<Chat pdf_id={page.params.pdf_id} {markdown} />
					</div>
				</Tabs.Content>
			</Tabs.Root>
		</div>
	</div>
</div>
