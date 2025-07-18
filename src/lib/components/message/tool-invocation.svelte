<script lang="ts">
	import type { ToolInvocation } from '@ai-sdk/ui-utils'
	import Twitter from './tool/twitter.svelte'
	import TwitterLogo from '$lib/icons/twitter-logo.svelte'
	import { Skeleton } from '$lib/components/ui/skeleton'
	import WebSearch from './tool/web-search.svelte'
	import type { UIMessage } from 'ai'
	import AcademicSearch from './tool/academic-search.svelte'
	import { BookIcon, LibraryBigIcon } from 'lucide-svelte'
	import ImageGeneration from './tool/image-generation.svelte'
	import { CircleDollarSignIcon, ImageIcon } from '@lucide/svelte'
	import OpenaiIcon from '$lib/icons/openai-icon.svelte'
	import * as m from '$lib/paraglide/messages'
	import WebReaderExa from './tool/web-reader-exa.svelte'
	import CurrencyConverter from './tool/currency-converter.svelte'

	let {
		toolInvocation,
		message,
	}: { toolInvocation: ToolInvocation; message: UIMessage } = $props()

	type QueryCompletion = {
		type: 'query_completion'
		data: {
			query: string
			index: number
			total: number
			status: 'completed'
			resultsCount: number
			imagesCount: number
		}
	}

	let args = $derived(JSON.parse(JSON.stringify(toolInvocation.args)))
	let result = $derived(
		'result' in toolInvocation
			? JSON.parse(JSON.stringify(toolInvocation.result))
			: null,
	)
</script>

{#if toolInvocation.toolName === 'web_search'}
	<WebSearch
		{result}
		{args}
		annotations={(message?.annotations?.filter(
			(a: any) => a.type === 'query_completion',
		) as QueryCompletion[]) || []} />
{:else if 'result' in toolInvocation}
	{#if toolInvocation.toolName === 'x_search'}
		<Twitter {toolInvocation} />
	{:else if toolInvocation.toolName === 'academic_search'}
		<AcademicSearch result={toolInvocation.result} />
	{:else if toolInvocation.toolName === 'web_reader_exa'}
		<WebReaderExa result={toolInvocation.result} />
	{:else if toolInvocation.toolName === 'image_generation' || toolInvocation.toolName === 'gpt-image-1'}
		<ImageGeneration result={toolInvocation.result} />
	{:else if toolInvocation.toolName === 'currency_converter'}
		<CurrencyConverter result={toolInvocation.result} />
	{/if}
{:else if toolInvocation.toolName === 'x_search'}
	<div class="flex items-center gap-4 rounded border p-4">
		<div
			class="flex size-12 animate-pulse items-center justify-center rounded-full border object-cover p-3">
			<TwitterLogo />
		</div>
		<div class="flex animate-pulse flex-col justify-start gap-2">
			<div>{m['tools.x.getting_posts']()}</div>
			<div class="flex items-center gap-2">
				<Skeleton class="h-2 w-8" />
				<Skeleton class="h-2 w-16" />
			</div>
		</div>
	</div>
{:else if toolInvocation.toolName === 'academic_search'}
	<div class="flex items-center gap-4 rounded border p-4">
		<div
			class="flex size-12 animate-pulse items-center justify-center rounded-full border object-cover p-3">
			<BookIcon />
		</div>
		<div class="flex animate-pulse flex-col justify-start gap-2">
			<div>{m['tools.academic.getting_papers']()}</div>
			<div class="flex items-center gap-2">
				<Skeleton class="h-2 w-8" />
				<Skeleton class="h-2 w-16" />
			</div>
		</div>
	</div>
{:else if toolInvocation.toolName === 'web_reader_exa'}
	<div class="flex items-center gap-4 rounded border p-4">
		<div
			class="flex size-12 animate-pulse items-center justify-center rounded-full border object-cover p-3">
			<LibraryBigIcon />
		</div>
		<div class="flex animate-pulse flex-col justify-start gap-2">
			<div>{m['tools.article.reading_article']()}</div>
			<div class="flex items-center gap-2">
				<Skeleton class="h-2 w-8" />
				<Skeleton class="h-2 w-16" />
			</div>
		</div>
	</div>
{:else if toolInvocation.toolName === 'image_generation' || toolInvocation.toolName === 'gpt-image-1'}
	<!-- https://github.com/cruip/cruip-tutorials/blob/main/animated-gradient-border/index.html -->
	<div
		class="h-96 w-full animate-[border_4s_linear_infinite] rounded-2xl border border-transparent [background:linear-gradient(45deg,var(--background))_padding-box,conic-gradient(from_var(--border-angle),var(--secondary)_80%,var(--primary)_86%,var(--primary)_90%,var(--primary)_94%,var(--secondary))_border-box]">
		<div class="flex h-full items-center justify-center gap-4 p-4">
			<div
				class="flex size-32 animate-pulse items-center justify-center rounded-full border object-cover p-3">
				{#if toolInvocation.toolName === 'image_generation'}
					<ImageIcon class="size-16" />
				{:else}
					<OpenaiIcon class="size-16" />
				{/if}
			</div>
		</div>
	</div>
{:else if toolInvocation.toolName === 'currency_converter'}
	<div
		class="h-96 w-full animate-[border_4s_linear_infinite] rounded-2xl border border-transparent [background:linear-gradient(45deg,var(--background))_padding-box,conic-gradient(from_var(--border-angle),var(--secondary)_80%,var(--primary)_86%,var(--primary)_90%,var(--primary)_94%,var(--secondary))_border-box]">
		<div class="flex h-full items-center justify-center gap-4 p-4">
			<div
				class="flex size-32 animate-pulse items-center justify-center rounded-full border object-cover p-3">
				<CircleDollarSignIcon class="size-16" />
			</div>
		</div>
	</div>
{/if}

<style lang="postcss">
	@property --border-angle {
		inherits: false;
		initial-value: 0deg;
		syntax: '<angle>';
	}
</style>
