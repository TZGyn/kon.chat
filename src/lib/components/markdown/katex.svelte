<script module>
	// @ts-ignore
	import katex from 'https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.mjs'
</script>

<script lang="ts">
	import type { Tokens } from 'marked'

	let { token }: { token: Tokens.Generic } = $props()
</script>

<link
	rel="stylesheet"
	href="https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.css"
	integrity="sha384-FkTZUsHjYVyYpU6dse+5AzszY5617FqhnLpcMIIAlLKTbdmeVMO/7K6BrdHWM28V"
	crossorigin="anonymous" />

{@html katex.renderToString(token.text, {
	displayMode: token.displayMode ?? false,
	throwOnError: false,
})}
