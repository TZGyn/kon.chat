<script lang="ts">
	import { getChartDataState } from '$lib/states/data-visualizer-chart-data.svelte'
	import {
		AreaChartIcon,
		BarChart4Icon,
		LineChartIcon,
		PieChartIcon,
	} from '@lucide/svelte'

	let { result }: { result: { chartData: ChartData[] } } = $props()

	let chartState = getChartDataState()

	let chartData = $derived(result.chartData)
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
	class="bg-secondary flex w-full flex-col gap-1 rounded-lg border p-4 hover:cursor-pointer"
	onclick={() => {
		chartState.chartData = chartData
	}}>
	{#each chartData as res}
		<div class="flex items-center gap-2 text-sm [&_svg]:size-4">
			{#if res.type === 'area'}
				<AreaChartIcon />
			{:else if res.type === 'bar'}
				<BarChart4Icon />
			{:else if res.type === 'line'}
				<LineChartIcon />
			{:else if res.type === 'pie'}
				<PieChartIcon />
			{/if}
			{res.title}
		</div>
	{/each}
</div>
