<script lang="ts">
	import { markedKatexExtension } from '$lib/markdown/katex-extension'
	import { marked } from 'marked'
	import MarkdownRenderer from './markdown-renderer.svelte'

	let { content, id }: { content: string; id: string } = $props()

	const options = {
		throwOnError: false,
	}
	marked.use(markedKatexExtension(options))
	let tokens = $derived(marked.lexer(content.trim()))
</script>

{#key id}
	<div
		class="prose prose-neutral dark:prose-invert prose-p:my-0 prose-pre:m-0 prose-pre:bg-transparent prose-pre:rounded-t-none">
		<MarkdownRenderer {tokens} />
	</div>
{/key}
