<script lang="ts">
	import { BarChart } from 'layerchart'
	import { scaleBand } from 'd3-scale'
	import * as Chart from '$lib/components/ui/chart/index.js'
	import * as Card from '$lib/components/ui/card/index.js'
	import { cn } from '$lib/utils'
	import type { BarChartData } from '$api/ai/tools/data-visuallizer'

	let data: BarChartData = $props()

	let title = $derived(data.title)
	let description = $derived(data.description)
	let columns = $derived(data.columns)

	let processedData = $derived.by(() => {
		let processed: any[] = []

		for (let i = 0; i < data.data[0].data.length; i++) {
			let res = {}

			Object.assign(res, {
				x: data.data[0].data[i].x,
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

	let maxY = $derived.by(() => {
		let max = 0

		processedData.map((data) => {
			console.log(Object.entries(data))
			Object.entries(data).map(([key, value]) => {
				if (key === 'x') return
				if (parseFloat(value as any) > max) {
					max = parseFloat(value as any)
				}
			})
		})
		return max
	})

	let chartConfig = $derived.by(() => {
		let processed: Record<string, { label: string; color: string }> =
			{}

		for (let i = 0; i < data.data.length; i++) {
			Object.assign(processed, {
				[`y${i}`]: data.data[i].label,
			})
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
			<BarChart
				data={processedData}
				xScale={scaleBand().padding(0.25)}
				x="x"
				{series}
				yDomain={[0, maxY]}
				orientation={data.orientation}
				seriesLayout={data.seriesLayout}>
				{#snippet tooltip()}
					<Chart.Tooltip />
				{/snippet}
			</BarChart>
		</Chart.Container>
	</Card.Content>
</Card.Root>
