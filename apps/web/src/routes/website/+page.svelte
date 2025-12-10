<script lang="ts">
	import * as monaco from 'monaco-editor'
	import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
	import { onDestroy, onMount } from 'svelte'
	import Textarea from '$lib/components/ui/textarea/textarea.svelte'
	import * as Tooltip from '$lib/components/ui/tooltip'
	import * as Resizable from '$lib/components/ui/resizable/index.js'
	import {
		ChevronDownIcon,
		ImageIcon,
		Loader2Icon,
		MessageCircleIcon,
		NotepadTextIcon,
		PaperclipIcon,
		SendIcon,
		SquareIcon,
		XIcon,
	} from 'lucide-svelte'
	import { Button, buttonVariants } from '$lib/components/ui/button'
	import { cn } from '$lib/utils'
	import { processDataStream } from '@ai-sdk/ui-utils'
	import { authClient } from '$lib/auth-client'
	import { client } from '$lib/fetch'

	const session = authClient.useSession()


	let editorElement: HTMLDivElement
	let editor: monaco.editor.IStandaloneCodeEditor
	let model: monaco.editor.ITextModel

	let input = $state('')
	let inputElement = $state<HTMLTextAreaElement | null>(null)

	let fileInput: HTMLInputElement | null = $state(null)
	let fileInputs: File[] = $state([])

	let chatOpen = $state(false)

	let status = $state<'ready' | 'submitted' | 'streaming' | 'error'>(
		'ready',
	)

	function loadCode(code: string, language: string) {
		model = monaco.editor.createModel(code, language)

		editor?.setModel(model)
	}

	let code = $state('')
	let htmlString = $derived.by(() => {
		if (!code) return ``
		const htmlLines = code.split('\n')
		htmlLines.splice(2, 0, `    <base href='about:srcdoc'>`)
		return htmlLines.join('\n')
	})

	$effect(() => {
		if (code.includes('<html>') && !code.includes('</html>')) {
			code += '\n</html>'
		}
	})

	onMount(async () => {
		self.MonacoEnvironment = {
			getWorker: function (_: any, label: string) {
				return new htmlWorker()
			},
		}

		editor = monaco.editor.create(editorElement, {
			automaticLayout: true,
			theme: 'vs-dark',
		})

		editor.onDidChangeModelContent((e) => {
			code = editor?.getValue() || ''
		})

		loadCode('', 'html')
	})

	onDestroy(() => {
		monaco?.editor.getModels().forEach((model) => model.dispose())
		editor?.dispose()
	})

	$effect(() => {
		input
		adjustInputHeight()
	})

	const adjustInputHeight = () => {
		if (inputElement) {
			inputElement.style.height = 'auto'
			inputElement.style.height = `${inputElement.scrollHeight + 2}px`
		}
	}
	const controller = new AbortController()

	const stop = () => {
		controller.abort()
		status = 'ready'
	}

	const submit = async () => {
		status = 'submitted'

		const response = await client.website.$post(
			{
				form: {
					currentHtml: editor.getValue(),
					prompt: input,
					userAvatar: $session.data?.user?.image ?? '',
					file: fileInputs[0] ?? undefined,
				},
			},
			{ init: { signal: controller.signal } },
		)

		status = 'streaming'

		if (response.status !== 200 || !response.body) {
			status = 'error'
			return
		}

		editor?.setValue('')

		await processDataStream({
			stream: response.body,
			onTextPart: (value) => {
				editor?.setValue(editor.getValue() + value)
			},
		})

		status = 'ready'
	}

	let moving = false
	let clientWidth = $state(0)
	let clientHeight = $state(0)
	let innerWidth = $state(0)
	let innerHeight = $state(0)

	let left = $state(30)
	let lastLeft = $state(30)
	let top = $state(20)
	let lastTop = $state(30)

	function onMouseDown(e: MouseEvent) {
		if (!e.shiftKey) return
		moving = true
	}

	function onMouseMove(e: MouseEvent) {
		if (moving) {
			left += e.movementX
			top += e.movementY

			checkBoundary()
		}
	}

	const checkBoundary = () => {
		if (left < 0) {
			left = 0
		} else if (left > innerWidth - clientWidth) {
			left = innerWidth - clientWidth
		}
		if (top < 0) {
			top = 0
		} else if (top > innerHeight - clientHeight) {
			top = innerHeight - clientHeight
		}
	}

	function onMouseUp() {
		moving = false
	}
</script>

<svelte:window onmouseup={onMouseUp} bind:innerHeight />
<div class="flex flex-1">
	<Resizable.PaneGroup class="flex-1" direction="horizontal">
		<Resizable.Pane class="flex border" defaultSize={40}>
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="@container relative flex flex-1 overflow-hidden"
				bind:clientWidth={innerWidth}
				onmousemove={onMouseMove}
				onmouseup={onMouseUp}>
				<div bind:this={editorElement} class="w-full"></div>
				<section
					role="button"
					tabindex="0"
					bind:clientWidth
					bind:clientHeight
					onmousedown={onMouseDown}
					style="left: {left}px; top: {top}px;"
					class="absolute z-50 flex flex-nowrap text-nowrap">
					<div
						class={cn(
							'bg-background flex h-auto w-full max-w-[100cqw] min-w-[500px] flex-col gap-2 rounded-xl p-3',
							!chatOpen && 'w-fit min-w-0 p-0',
						)}>
						<div class="flex items-start gap-2">
							{#if chatOpen}
								<Textarea
									bind:value={input}
									bind:ref={inputElement}
									class="max-h-96 min-h-4 resize-none border-none bg-transparent px-4 pt-2 pb-0 focus-visible:ring-0 focus-visible:ring-offset-0"
									placeholder={'Send a prompt... (ctrl-enter to send)\nHold Shift To Drag'}
									onkeydown={(event) => {
										if (event.key === 'Enter' && event.ctrlKey) {
											event.preventDefault()

											submit()
										}
									}} />
							{/if}

							<div class="flex flex-col gap-1">
								<Button
									variant="ghost"
									size="icon"
									onclick={(e: any) => {
										if (e.shiftKey) return
										chatOpen = !chatOpen
										if (chatOpen) {
											lastLeft = left
											lastTop = top
										}
										setTimeout(() => {
											left = lastLeft
											top = lastTop
											checkBoundary()
										}, 10)
									}}>
									{#if chatOpen}
										<ChevronDownIcon />
									{:else}
										<MessageCircleIcon />
									{/if}
								</Button>
								{#if chatOpen}
									<input
										bind:this={fileInput}
										type="file"
										accept="application/pdf,image/png,image/jpg"
										onchange={(e) => {
											// @ts-ignore
											fileInputs = [e.target.files[0]]
										}}
										multiple={false}
										hidden />
									<Tooltip.Provider>
										<Tooltip.Root>
											<Tooltip.Trigger>
												<Button
													onclick={() => {
														fileInput?.click()
													}}
													variant="ghost"
													size="icon"
													class="">
													<PaperclipIcon />
												</Button>
											</Tooltip.Trigger>
											<Tooltip.Content class="max-w-[300px]">
												<p>File Upload</p>
											</Tooltip.Content>
										</Tooltip.Root>
									</Tooltip.Provider>
									{#if fileInputs}
										{#each fileInputs as file}
											<div class="relative">
												<div
													class={cn(
														buttonVariants({
															variant: 'outline',
															size: 'icon',
														}),
													)}>
													{#if file.type === 'application/pdf'}
														<NotepadTextIcon />
													{:else}
														<ImageIcon />
													{/if}
												</div>

												<XIcon
													onclick={() => (fileInputs = [])}
													class="hover:bg-accent pointer-events-auto absolute -top-1 -right-1 size-4 rounded hover:cursor-pointer" />
											</div>
										{/each}
									{/if}

									{#if status === 'submitted' || status === 'streaming'}
										<Button
											onclick={() => stop()}
											class=""
											size="icon">
											<SquareIcon />
										</Button>
									{:else}
										<Button onclick={() => submit()} size="icon">
											<SendIcon />
										</Button>
									{/if}
								{/if}
							</div>
						</div>
					</div>
				</section>
			</div>
		</Resizable.Pane>
		<Resizable.Handle
			class={cn(
				'after:bg-border relative hidden w-3 bg-transparent p-0 after:absolute after:top-1/2 after:right-0 after:h-8 after:w-[6px] after:translate-x-[-1px] after:-translate-y-1/2 after:rounded-full after:transition-all after:hover:h-10 sm:block',
			)} />
		<Resizable.Pane class="flex border" defaultSize={60}>
			<iframe
				srcdoc={htmlString}
				class="flex-1"
				title="preview"
				loading="eager"
				id="preview">
			</iframe>
		</Resizable.Pane>
	</Resizable.PaneGroup>
</div>
