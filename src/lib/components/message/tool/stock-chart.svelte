<script lang="ts">
	import * as Chart from '$lib/components/ui/chart/index.js'
	import * as Card from '$lib/components/ui/card/index.js'
	import { scaleUtc } from 'd3-scale'
	import { AreaChart } from 'layerchart'
	import { curveLinear } from 'd3-shape'
	import { m } from '$lib/paraglide/messages'

	let {
		result,
	}: {
		result: {
			prices: Record<string, any>
			symbol: string
			currency: 'USD'
			locale: 'en-us'
			latestPrice: number
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
		Object.keys(result.prices['Close']).map((key) => {
			const data = result.prices['Close'][key]
			return {
				date: new Date(parseInt(key)),
				price: parseFloat(data),
			}
		}),
	)

	let chartConfig = $derived({
		symbol: {
			label: result.symbol.toUpperCase(),
			color:
				chartData[0].price > chartData[chartData.length - 1].price
					? 'var(--color-red-600)'
					: 'var(--color-green-600)',
		},
	} satisfies Chart.ChartConfig)
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>
			{result.symbol.toUpperCase()}
		</Card.Title>
		<Card.Description>
			{m['tools.stock_chart.showing_stock_price_over']({
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
						key: 'price',
						label: result.symbol,
						color: chartConfig.symbol.color,
					},
				]}
				yDomain={[
					chartData.reduce((a, b) => (a.price < b.price ? a : b))
						.price,
					chartData.reduce((a, b) => (a.price > b.price ? a : b))
						.price,
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
						valueFormatter={(value: number) => {
							return new Intl.NumberFormat(result.locale, {
								currency: result.currency,
								style: 'currency',
							}).format(value)
						}} />
				{/snippet}
			</AreaChart>
		</Chart.Container>
	</Card.Content>
</Card.Root>
