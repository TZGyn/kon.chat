<script lang="ts">
	import { AreaChart, LineChart } from 'layerchart'
	import { scaleUtc } from 'd3-scale'
	import * as Chart from '$lib/components/ui/chart/index.js'
	import * as Card from '$lib/components/ui/card/index.js'
	import { cn } from '$lib/utils'
	import type { LineAreaChartData } from '$api/ai/tools/data-visuallizer'
	import { curveNatural } from 'd3-shape'

	let data: LineAreaChartData = $props()

	let title = $derived(data.title)
	let description = $derived(data.description)
	let columns = $derived(data.columns)

	let processedData = $derived.by(() => {
		let processed: any[] = []

		for (let i = 0; i < data.data[0].data.length; i++) {
			let res = {}

			Object.assign(res, {
				x: new Date(data.data[0].data[i].x),
			})

			for (let j = 0; j < data.data.length; j++) {
				Object.assign(res, {
					[`y${j}`]: data.data[j].data[i].y,
				})
			}

			processed.push(res)
		}

		return processed
	})

	let chartConfig = $derived.by(() => {
		let processed: Record<string, { label: string; color: string }> =
			{}

		for (let i = 0; i < data.data.length; i++) {
			processed[`y${i}`] = {
				label: data.data[i].label,
				color: data.data[i].color,
			}
		}

		return processed satisfies Chart.ChartConfig
	})

	let series = $derived.by(() => {
		let processed: { key: string; label: string; color: string }[] =
			[]
		for (let i = 0; i < data.data.length; i++) {
			let res = {
				key: `y${i}`,
				label: data.data[i].label,
				color: data.data[i].color,
			}

			processed.push(res)
		}

		return processed
	})
</script>

<Card.Root class={cn(columns === 2 && 'col-span-2')}>
	<Card.Header>
		<Card.Title>{title}</Card.Title>
		<Card.Description>
			{description}
		</Card.Description>
	</Card.Header>
	<Card.Content>
		<Chart.Container config={chartConfig}>
			{#if data.type === 'area'}
				<AreaChart
					data={processedData}
					x="x"
					xScale={scaleUtc()}
					{series}
					seriesLayout="stack"
					props={{
						area: {
							curve: curveNatural,
							'fill-opacity': 0.4,
							line: { class: 'stroke-1' },
							motion: 'tween',
						},
						xAxis: {
							format: (v: Date) =>
								v.toLocaleDateString('en-US', {
									month: 'short',
									year: 'numeric',
								}),
						},
						yAxis: {
							format: (v) => v,
						},
					}}>
					{#snippet tooltip()}
						<Chart.Tooltip
							indicator="line"
							labelFormatter={(v: Date) => {
								return v.toLocaleDateString('en-US', {
									month: 'long',
									year: 'numeric',
								})
							}} />
					{/snippet}
				</AreaChart>
			{:else}
				<LineChart
					data={processedData}
					x="x"
					xScale={scaleUtc()}
					{series}
					props={{
						spline: {
							curve: curveNatural,
							motion: 'tween',
							strokeWidth: 2,
						},
						xAxis: {
							ticks: 5,
							format: (v: Date) =>
								v.toLocaleDateString('en-US', {
									month: 'short',
									year: 'numeric',
								}),
						},
						highlight: { points: { r: 4 } },
					}}>
					{#snippet tooltip()}
						<Chart.Tooltip
							labelFormatter={(v: Date) => {
								return v.toLocaleDateString('en-US', {
									month: 'long',
									year: 'numeric',
								})
							}} />
					{/snippet}
				</LineChart>
			{/if}
		</Chart.Container>
	</Card.Content>
</Card.Root>
