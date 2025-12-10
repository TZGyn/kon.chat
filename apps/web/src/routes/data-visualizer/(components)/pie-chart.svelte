<script lang="ts">
	import { PieChart } from 'layerchart'
	import * as Chart from '$lib/components/ui/chart/index.js'
	import * as Card from '$lib/components/ui/card/index.js'
	import { cn } from '$lib/utils'
	import type { PieChartData } from '@kon.chat/backend'

	let data: PieChartData = $props()

	let title = $derived(data.title)
	let description = $derived(data.description)
	let columns = $derived(data.columns)

	let chartConfig = $derived.by(() => {
		let processed: Record<string, { label: string; color: string }> =
			{}

		for (let i = 0; i < data.data.length; i++) {
			processed[data.data[i].x] = {
				label: data.data[i].x,
				color: data.data[i].color,
			}
		}

		return processed satisfies Chart.ChartConfig
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
				<!-- {#snippet arc({ props, visibleData, index })}
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
				{/snippet} -->
			</PieChart>
		</Chart.Container>
	</Card.Content>
</Card.Root>
