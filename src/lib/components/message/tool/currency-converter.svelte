<script lang="ts">
	import TrendingUpIcon from '@lucide/svelte/icons/trending-up'
	import * as Chart from '$lib/components/ui/chart/index.js'
	import * as Card from '$lib/components/ui/card/index.js'
	import * as Select from '$lib/components/ui/select/index.js'
	import { scaleUtc } from 'd3-scale'
	import { Area, AreaChart, ChartClipPath } from 'layerchart'
	import { curveNatural, curveLinear } from 'd3-shape'
	import ChartContainer from '$lib/components/ui/chart/chart-container.svelte'
	import { cubicInOut } from 'svelte/easing'

	let {
		result,
	}: {
		result: {
			forwardRate: Record<string, any>
			backwardRate: Record<string, any>
			fromCurrency: string
			toCurrency: string
			amount: number
			convertedAmount: number
			period:
				| '1d'
				| '5d'
				| '1mo'
				| '3mo'
				| '6mo'
				| '1y'
				| '2y'
				| '5y'
				| '10y'
				| 'ytd'
				| 'max'
		}
	} = $props()

	let chartData = $derived(
		Object.keys(result.forwardRate['Close']).map((key) => {
			const data = result.forwardRate['Close'][key]
			return {
				date: new Date(parseInt(key)),
				desktop: parseFloat(data),
			}
		}),
	)

	const chartConfig = {
		desktop: { label: 'Desktop', color: 'var(--chart-1)' },
	} satisfies Chart.ChartConfig
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>
			{result.fromCurrency} - {result.toCurrency}
		</Card.Title>
		<Card.Description>
			Showing currency rate over {result.period}
		</Card.Description>
	</Card.Header>
	<Card.Content>
		<Chart.Container config={chartConfig}>
			<AreaChart
				data={chartData}
				x="date"
				xScale={scaleUtc()}
				series={[
					{
						key: 'desktop',
						label: 'Desktop',
						color: chartConfig.desktop.color,
					},
				]}
				yDomain={[
					chartData.reduce((a, b) => (a.desktop < b.desktop ? a : b))
						.desktop,
					chartData.reduce((a, b) => (a.desktop > b.desktop ? a : b))
						.desktop,
				]}
				props={{
					area: {
						curve: curveLinear,
						'fill-opacity': 0.4,
						line: { class: 'stroke-1' },
						motion: 'spring',
					},
					xAxis: {
						ticks: 5,
						format: (v: Date) =>
							v.toLocaleDateString('en-US', {
								month: 'short',
								day: 'numeric',
							}),
					},
					yAxis: {},
				}}>
				{#snippet tooltip()}
					<Chart.Tooltip
						labelFormatter={(label: Date) => {
							return label.toLocaleDateString()
						}} />
				{/snippet}
			</AreaChart>
		</Chart.Container>
	</Card.Content>
</Card.Root>
