<script lang="ts">
	import { codeToHtml } from 'shiki'
	let { code, lang }: { code: string; lang: string } = $props()

	let codeHTML = $state('')

	const updateHTML = async (code: string) => {
		const html = await codeToHtml(code, {
			lang: lang,
			theme: 'dark-plus',
		})
		codeHTML = html
	}

	$effect(() => {
		updateHTML(code)
	})
</script>

{#key codeHTML}
	{@html codeHTML}
{/key}
