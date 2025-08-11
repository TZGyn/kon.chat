<script lang="ts">
	import {
		FileDropZone,
		type FileDropZoneProps,
	} from '$lib/components/ui/file-drop-zone'
	import { Input } from '$lib/components/ui/input'
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js'
	import * as Resizable from '$lib/components/ui/resizable/index.js'
	import { Textarea } from '$lib/components/ui/textarea'
	import { m } from '$lib/paraglide/messages'
	import {
		CalendarIcon,
		EllipsisVerticalIcon,
		FileIcon,
		HouseIcon,
		InboxIcon,
		PaperclipIcon,
		SearchIcon,
		SendIcon,
		SettingsIcon,
		XIcon,
	} from '@lucide/svelte'
	import { byteToHumanReadable } from '$lib/utils'
	import * as Sidebar from '$lib/components/ui/sidebar/index.js'
	import { IsMobile } from '$lib/hooks/is-mobile.svelte.js'
	import { Chat } from '@ai-sdk/svelte'
	import { PUBLIC_API_URL } from '$env/static/public'
	import { UseAutoScroll } from '$lib/hooks/use-auto-scroll.svelte'
	import MessageBlock from '$lib/components/message-block.svelte'
	import Chart from './(components)/chart.svelte'
	import { Button } from '$lib/components/ui/button'
	import { getChartDataState } from '$lib/states/data-visualizer-chart-data.svelte'

	const autoScroll = new UseAutoScroll()

	let files = $state<File[]>([])

	let fileInput: HTMLInputElement | null = $state(null)
	let fileInputs: FileList | undefined = $state()

	$effect(() => {
		if (!fileInputs) return
		for (const file of fileInputs) {
			files.push(file)
		}
		fileInputs = undefined
	})

	let chartState = getChartDataState()

	const chat = new Chat({
		api: PUBLIC_API_URL + '/data-visualizer',
		credentials: 'include',
		onToolCall: ({ toolCall }) => {
			console.log(toolCall)
			chartState.chartData = (
				toolCall.args as { chartData: ChartData[] }
			).chartData
		},
		onResponse: (response) => {},
		onError: (error) => {
			chat.messages[chat.messages.length - 1].annotations?.push({
				type: 'kon_chat',
				status: 'error',
				error: {
					type: error.name,
					message: error.message,
				},
			})
		},
	})

	const toBase64 = (file: File) =>
		new Promise((resolve, reject) => {
			const reader = new FileReader()
			reader.readAsDataURL(file)
			reader.onload = () => resolve(reader.result)
			reader.onerror = reject
		})

	async function customSubmit(event: Event) {
		const attachments = await Promise.all(
			files.map(async (file) => ({
				contentType: file.type,
				name: file.name,
				url: (await toBase64(file)) as string,
			})),
		)
		chat.handleSubmit(event, {
			experimental_attachments: attachments,
		})
		files = []
	}
</script>

<div class="relative flex flex-1 overflow-hidden">
	<Resizable.PaneGroup direction="horizontal" class="flex-1">
		<Resizable.Pane defaultSize={50} minSize={25} class="flex">
			<div class="@container flex-1 overflow-y-scroll p-8">
				<div class="grid grid-cols-1 gap-4 @xl:grid-cols-2">
					{#each chartState.chartData as data}
						<Chart {...data} />
					{/each}
				</div>
			</div>
		</Resizable.Pane>
		<Resizable.Handle />
		<Resizable.Pane defaultSize={50} minSize={25}>
			<Resizable.PaneGroup direction="vertical">
				<Resizable.Pane defaultSize={75} class="flex flex-1 flex-col">
					<div
						bind:this={autoScroll.ref}
						class="@container flex flex-1 flex-col items-center overflow-y-scroll p-4">
						<div
							class="@container/chat flex w-full max-w-[600px] flex-col gap-4">
							{#each chat.messages as message, index (index)}
								<MessageBlock
									data={chat.data}
									message={{ ...message, status: 'ready' }}
									role={message.role}
									isLast={index === chat.messages.length - 1} />
							{/each}
						</div>
					</div>
					{#if files.length > 0}
						<div
							class="flex max-h-64 flex-wrap gap-2 overflow-y-scroll border-t p-2">
							{#each files as file, index}
								<div
									class="flex gap-2 overflow-hidden rounded-lg border">
									<div
										class="flex flex-1 flex-col overflow-hidden p-2">
										<div
											class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
											<span>
												{file.name}
											</span>
										</div>
										<div class="text-muted-foreground text-sm">
											{byteToHumanReadable(file.size)}
										</div>
									</div>
									<!-- svelte-ignore a11y_click_events_have_key_events -->
									<!-- svelte-ignore a11y_no_static_element_interactions -->
									<div
										class="bg-popover hover:bg-secondary flex items-center justify-center border-l p-4"
										onclick={() => {
											files.splice(index, 1)
										}}>
										<XIcon class="size-4" />
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</Resizable.Pane>
				<Resizable.Handle />
				<Resizable.Pane
					defaultSize={25}
					maxSize={75}
					minSize={25}
					class="bg-secondary flex flex-col">
					<div class="flex-1">
						<Textarea
							bind:value={chat.input}
							onpaste={(event) => {
								console.log(event)
								const files = Array.from(
									event.clipboardData?.files ?? [],
								)
								if (files.length > 0) {
									event.preventDefault()
									files.push(...files)
								}
							}}
							class="h-full resize-none rounded-none border-none !bg-transparent p-4 focus-visible:ring-0 focus-visible:ring-offset-0"
							placeholder={m.send_a_message() +
								' ' +
								m.ctrl_enter_to_send()}
							onkeydown={(event) => {
								if (event.key === 'Enter' && event.ctrlKey) {
									event.preventDefault()

									customSubmit(event)
								}
							}} />
					</div>
					<div class="flex justify-between border-t">
						<input
							bind:this={fileInput}
							type="file"
							accept="*"
							bind:files={fileInputs}
							multiple={true}
							hidden />

						<Button
							onclick={() => {
								fileInput?.click()
							}}
							variant="ghost"
							size="icon">
							<PaperclipIcon />
						</Button>
						<Button
							size="icon"
							variant="ghost"
							onclick={(event: Event) => {
								event.preventDefault()

								customSubmit(event)
							}}>
							<SendIcon />
						</Button>
					</div>
				</Resizable.Pane>
			</Resizable.PaneGroup>
		</Resizable.Pane>
	</Resizable.PaneGroup>

	<!--  -->
</div>
