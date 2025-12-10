<script lang="ts">
	import * as Chart from '$lib/components/ui/chart/index.js'
	import * as Card from '$lib/components/ui/card/index.js'
	import { scaleUtc } from 'd3-scale'
	import { AreaChart } from 'layerchart'
	import { curveLinear } from 'd3-shape'
	import { m } from '$lib/paraglide/messages'
	import { getSymbol } from '$lib/currency-symbol'

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
				to: parseFloat(data),
			}
		}),
	)

	const chartConfig = {
		to: { label: result.toCurrency, color: 'var(--chart-1)' },
	} satisfies Chart.ChartConfig
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>
			{result.fromCurrency} ({getSymbol(result.fromCurrency) || ''}) -
			{result.toCurrency} ({getSymbol(result.toCurrency) || ''})
		</Card.Title>
		<Card.Description>
			{m['tools.currency_converter.showing_convertion_rate_over']({
				period: result.period,
			})}
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
						key: 'to',
						label: result.toCurrency,
						color: chartConfig.to.color,
					},
				]}
				yDomain={[
					chartData.reduce((a, b) => (a.to < b.to ? a : b)).to,
					chartData.reduce((a, b) => (a.to > b.to ? a : b)).to,
				]}
				props={{
					area: {
						curve: curveLinear,
						'fill-opacity': 0.15,
						line: { class: 'stroke-[1.5]' },
						motion: 'tween',
					},
					xAxis: {
						ticks: 5,
						format: (v: Date) =>
							v.toLocaleDateString('en-US', {
								month: 'short',
								day: 'numeric',
								year: 'numeric',
							}),
					},
					yAxis: {},
				}}>
				{#snippet tooltip()}
					<Chart.Tooltip
						labelFormatter={(label: Date) => {
							return label.toLocaleDateString()
						}}
						valueFormatter={(value: Number) => {
							return value.toString().slice(0, 8)
						}} />
				{/snippet}
			</AreaChart>
		</Chart.Container>
	</Card.Content>
</Card.Root>
