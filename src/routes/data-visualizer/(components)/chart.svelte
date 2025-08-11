<script lang="ts">
	import {
		Arc,
		AreaChart,
		BarChart,
		LineChart,
		PieChart,
		Text,
	} from 'layerchart'
	import TrendingUpIcon from '@lucide/svelte/icons/trending-up'
	import { curveLinear, curveNatural } from 'd3-shape'
	import { scaleBand, scaleUtc } from 'd3-scale'
	import * as Chart from '$lib/components/ui/chart/index.js'
	import * as Card from '$lib/components/ui/card/index.js'
	import { cn } from '$lib/utils'
	import { cubicInOut } from 'svelte/easing'

	let data: ChartData = $props()

	let title = $derived(data.title)
	let description = $derived(data.description)
	let columns = $derived(data.columns)
	let yLabel = $derived(data.yLabel)

	let color = $derived('color' in data ? data.color : '#fff')

	const chartConfig = $derived({
		y: { label: yLabel, color: color },
	} satisfies Chart.ChartConfig)
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
					data={data.data.map((data) => {
						return {
							...data,
							x: new Date(data.x),
						}
					})}
					x="x"
					xScale={scaleUtc()}
					y="y"
					series={[
						{
							key: 'y',
							label: yLabel,
							color: color,
						},
					]}
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
			{:else if data.type === 'bar'}
				<BarChart
					data={data.data}
					xScale={scaleBand().padding(0.25)}
					x="x"
					series={[{ key: 'y', label: yLabel, color: color }]}
					props={{
						bars: {
							stroke: 'none',
							rounded: 'all',
							radius: 8,
							// use the height of the chart to animate the bars
							// initialY: context?.height,
							initialHeight: 0,
							motion: {
								x: {
									type: 'tween',
									duration: 500,
									easing: cubicInOut,
								},
								width: {
									type: 'tween',
									duration: 500,
									easing: cubicInOut,
								},
								height: {
									type: 'tween',
									duration: 500,
									easing: cubicInOut,
								},
								y: {
									type: 'tween',
									duration: 500,
									easing: cubicInOut,
								},
							},
						},
						highlight: { area: { fill: 'none' } },
						xAxis: { format: (d) => d },
					}}>
					{#snippet tooltip()}
						<Chart.Tooltip hideLabel />
					{/snippet}
				</BarChart>
			{:else if data.type === 'line'}
				<LineChart
					data={data.data.map((data) => {
						return {
							...data,
							x: new Date(data.x),
						}
					})}
					x="x"
					xScale={scaleUtc()}
					series={[
						{
							key: 'y',
							label: yLabel,
							color: color,
						},
					]}
					props={{
						spline: {
							curve: curveLinear,
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
			{:else if data.type === 'pie'}
				<PieChart
					data={data.data}
					key="x"
					value="y"
					cRange={data.data.map((d) => d.color)}
					c="color"
					props={{
						pie: {
							motion: 'tween',
						},
					}}>
					{#snippet tooltip()}
						<Chart.Tooltip />
					{/snippet}
					{#snippet arc({ props, visibleData, index })}
						<Arc {...props}>
							{#snippet children({ getArcTextProps })}
								<Text
									value={visibleData[index].x}
									{...getArcTextProps('outer', {
										startOffset: '50%',
										outerPadding: 10,
									})}
									class="fill-foreground" />
							{/snippet}
						</Arc>
					{/snippet}
				</PieChart>
			{/if}
		</Chart.Container>
	</Card.Content>
</Card.Root>
