<script lang="ts">
	import { FileCodeIcon } from '@lucide/svelte'
	import Javascript from './javascript.svelte'
	import Go from './go.svelte'
	import Typescript from './typescript.svelte'
	import Python from './python.svelte'
	import Rust from './rust.svelte'

	let {
		filetype,
	}: {
		filetype: string
	} = $props()
</script>

{#if filetype === 'javascript'}
	<Javascript />
{:else if filetype === 'typescript'}
	<Typescript />
{:else if filetype === 'python'}
	<Python />
{:else if filetype === 'go'}
	<Go />
{:else if filetype === 'rust'}
	<Rust />
{:else}
	<FileCodeIcon />
{/if}
