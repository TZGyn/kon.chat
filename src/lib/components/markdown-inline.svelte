<script lang="ts">
	import DOMPurify from 'isomorphic-dompurify'
	import { toast } from 'svelte-sonner'

	import type { Token } from 'marked'

	import { copy } from '$lib/clipboard'
	import { browser } from '$app/environment'

	import katex from 'katex'

	export let tokens: Token[]

	function unescapeHtml(html: string) {
		if (!browser) return null
		const doc = new DOMParser().parseFromString(html, 'text/html')
		return doc.documentElement.textContent
	}
</script>

{#each tokens as token}
	{#if token.type === 'escape'}
		{unescapeHtml(token.text)}
	{:else if token.type === 'html'}
		{@const html = DOMPurify.sanitize(token.text)}
		{#if html && html.includes('<video')}
			{@html html}
		{:else}
			{token.text}
		{/if}
	{:else if token.type === 'link'}
		{#if token.tokens}
			<a
				href={token.href}
				target="_blank"
				rel="nofollow"
				title={token.title}>
				<svelte:self tokens={token.tokens} />
			</a>
		{:else}
			<a
				href={token.href}
				target="_blank"
				rel="nofollow"
				title={token.title}>
				{token.text}
			</a>
		{/if}
	{:else if token.type === 'strong'}
		<strong>
			<svelte:self tokens={token.tokens} />
		</strong>
	{:else if token.type === 'em'}
		<em>
			<svelte:self tokens={token.tokens} />
		</em>
	{:else if token.type === 'codespan'}
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
		<code
			class="bg-secondary text-muted-foreground cursor-pointer rounded px-2 py-1 before:content-none after:content-none"
			on:click={() => {
				copy(unescapeHtml(token.text)!)
				toast.success('Copied to clipboard')
			}}>
			{unescapeHtml(token.text)}
		</code>
	{:else if token.type === 'br'}
		<br />
	{:else if token.type === 'del'}
		<del>
			<svelte:self tokens={token.tokens} />
		</del>
	{:else if token.type === 'inlineKatex'}
		{#if token.text}
			{@html katex.renderToString(token.text, {
				displayMode: token.displayMode ?? false,
				throwOnError: false,
			})}
		{/if}
	{:else if token.type === 'iframe'}
		<!-- <iframe
			src="{WEBUI_BASE_URL}/api/v1/files/{token.fileId}/content"
			title={token.fileId}
			width="100%"
			frameborder="0"
			onload="this.style.height=(this.contentWindow.document.body.scrollHeight+20)+'px';">
		</iframe> -->
	{:else if token.type === 'text'}
		<span>
			{token.raw}
		</span>
	{/if}
{/each}
