<script lang="ts">
	import { cn } from '$lib/utils'

	let { class: className }: { class?: string } = $props()
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	class={cn(
		'h-[256px] w-[256px] fill-black dark:fill-white',
		className,
	)}
	viewBox="0 0 1200 1227">
	<path
		d="M714.163 519.284 1160.89 0h-105.86L667.137 450.887 357.328 0H0l468.492 681.821L0 1226.37h105.866l409.625-476.152 327.181 476.152H1200L714.137 519.284h.026ZM569.165 687.828l-47.468-67.894-377.686-540.24h162.604l304.797 435.991 47.468 67.894 396.2 566.721H892.476L569.165 687.854v-.026Z" />
</svg>
