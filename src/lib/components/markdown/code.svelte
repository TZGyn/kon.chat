<script lang="ts">
	import { codeToHtml, isPlainLang, bundledLanguages } from 'shiki'
	import CopyButton from '../copy-button.svelte'
	import Button from '../ui/button/button.svelte'
	import { loadPyodide } from 'pyodide'
	import { TerminalIcon, TriangleIcon } from 'lucide-svelte'
	let { code, lang }: { code: string; lang: string } = $props()

	let codeHTML = $state('')

	const updateHTML = async (code: string) => {
		const html = await codeToHtml(code, {
			lang: lang in bundledLanguages ? lang : 'text',
			theme: 'dark-plus',
		})
		codeHTML = html
	}

	$effect(() => {
		updateHTML(code)
	})

	interface ConsoleOutputContent {
		type: 'text' | 'image'
		value: string
	}

	let consoleOutput = $state<ConsoleOutputContent[][]>([])

	function detectRequiredHandlers(code: string): string[] {
		const handlers: string[] = ['basic']

		if (code.includes('matplotlib') || code.includes('plt.')) {
			handlers.push('matplotlib')
		}

		return handlers
	}
	const OUTPUT_HANDLERS = {
		matplotlib: `
    import io
    import base64
    from matplotlib import pyplot as plt

    # Clear any existing plots
    plt.clf()
    plt.close('all')

    # Switch to agg backend
    plt.switch_backend('agg')

    def setup_matplotlib_output():
        def custom_show():
            if plt.gcf().get_size_inches().prod() * plt.gcf().dpi ** 2 > 25_000_000:
                print("Warning: Plot size too large, reducing quality")
                plt.gcf().set_dpi(100)

            png_buf = io.BytesIO()
            plt.savefig(png_buf, format='png')
            png_buf.seek(0)
            png_base64 = base64.b64encode(png_buf.read()).decode('utf-8')
            print(f'data:image/png;base64,{png_base64}')
            png_buf.close()

            plt.clf()
            plt.close('all')

        plt.show = custom_show
  `,
		basic: `
    # Basic output capture setup
  `,
	}

	let runningCode = $state(false)

	const runPython = async (code: string) => {
		runningCode = true
		const currentPyodideInstance = await loadPyodide({
			indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.3/full/',
		})

		const outputArray: ConsoleOutputContent[] = []

		currentPyodideInstance.setStdout({
			batched: (output: string) => {
				outputArray.push({
					type: output.startsWith('data:image/png;base64')
						? 'image'
						: 'text',
					value: output,
				})
			},
		})

		await currentPyodideInstance.loadPackagesFromImports(code, {
			// messageCallback: (message: string) => {
			// 	setMetadata((metadata) => ({
			// 		...metadata,
			// 		outputs: [
			// 			...metadata.outputs.filter(
			// 				(output) => output.id !== runId,
			// 			),
			// 			{
			// 				id: runId,
			// 				contents: [{ type: 'text', value: message }],
			// 				status: 'loading_packages',
			// 			},
			// 		],
			// 	}))
			// },
		})

		const requiredHandlers = detectRequiredHandlers(code)
		for (const handler of requiredHandlers) {
			if (OUTPUT_HANDLERS[handler as keyof typeof OUTPUT_HANDLERS]) {
				await currentPyodideInstance.runPythonAsync(
					OUTPUT_HANDLERS[handler as keyof typeof OUTPUT_HANDLERS],
				)

				if (handler === 'matplotlib') {
					await currentPyodideInstance.runPythonAsync(
						'setup_matplotlib_output()',
					)
				}
			}
		}

		await currentPyodideInstance.runPythonAsync(code)

		consoleOutput.push(outputArray)

		runningCode = false

		// setMetadata((metadata) => ({
		// 	...metadata,
		// 	outputs: [
		// 		...metadata.outputs.filter((output) => output.id !== runId),
		// 		{
		// 			id: runId,
		// 			contents: outputContent,
		// 			status: 'completed',
		// 		},
		// 	],
		// }))
	}
</script>

<div
	class="bg-secondary flex items-center justify-between rounded-t px-2">
	<span class="py-1 text-sm">{lang}</span>
	<div>
		<CopyButton
			variant="ghost"
			class="hover:bg-transparent"
			text={code} />
		{#if lang === 'python'}
			<Button
				loading={runningCode}
				size="icon"
				variant="ghost"
				class="hover:bg-transparent"
				onclick={() => runPython(code)}>
				<TriangleIcon class="rotate-90" />
			</Button>
		{/if}
	</div>
</div>
{#key codeHTML}
	{@html codeHTML}
{/key}

<!-- class={cn('w-12 shrink-0', {
                  'text-muted-foreground': [
                    'in_progress',
                    'loading_packages',
                  ].includes(consoleOutput.status),
                  'text-emerald-500': consoleOutput.status === 'completed',
                  'text-red-400': consoleOutput.status === 'failed',
                })} -->
{#if consoleOutput.length > 0}
	<div
		class="bg-muted sticky top-0 z-50 mt-2 flex h-fit w-full flex-row items-center justify-between border-b border-zinc-200 px-2 py-1 dark:border-zinc-700">
		<div
			class="dark:bg-secondary flex flex-row items-center gap-3 pl-2 text-sm">
			<div class="text-muted-foreground">
				<TerminalIcon class="size-4" />
			</div>
			<div>Console</div>
		</div>
	</div>
	{#each consoleOutput as output, index}
		<div
			class="flex flex-row border-b border-zinc-200 bg-zinc-50 px-4 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900">
			<div class="w-12 shrink-0 text-emerald-500">
				{'>'}
			</div>
			<div
				class="flex w-full flex-col gap-2 text-zinc-900 dark:text-zinc-50">
				{#each output as content, index}
					{#if content.type === 'image'}
						<picture>
							<img
								src={content.value}
								alt="output"
								class="max-w-screen-toast-mobile w-full rounded-md" />
						</picture>
					{:else}
						<div class="w-full whitespace-pre-line break-words">
							{content.value}
						</div>
					{/if}
				{/each}
			</div>
		</div>
	{/each}
{/if}
