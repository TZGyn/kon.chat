<script lang="ts">
	let {
		result,
	}: {
		result: {
			files: string[]
		}
	} = $props()
</script>

{#each result.files as file}
	<img src={file} alt="generated_image" class="w-[300px]" />
{/each}
