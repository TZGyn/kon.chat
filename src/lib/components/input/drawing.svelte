<script lang="ts">
	import * as Popover from '$lib/components/ui/popover/index.js'
	import { cn } from '$lib/utils'
	import { BrushIcon } from '@lucide/svelte'
	import {
		Stage,
		Layer,
		Line,
		type KonvaMouseEvent,
		type KonvaTouchEvent,
	} from 'svelte-konva'
	import { buttonVariants } from '../ui/button'
	import Button from '$lib/components/ui/button/button.svelte'
	import ColorPicker from 'svelte-awesome-color-picker'

	let { addDrawing }: { addDrawing: (drawing: File) => void } =
		$props()

	let stageElement = $state<Stage>()
	let tool = $state<'pen' | 'eraser'>('pen')
	let isDrawing = $state(false)
	let lines = $state<
		{ tool: 'pen' | 'eraser'; points: number[]; stroke: string }[]
	>([])
	let hex = $state('#fff')

	const handleMouseDown = (e: KonvaMouseEvent | KonvaTouchEvent) => {
		isDrawing = true

		const pos = e.target.getStage()?.getPointerPosition() || {
			x: 0,
			y: 0,
		}
		lines = [...lines, { tool, points: [pos.x, pos.y], stroke: hex }]
	}

	const handleMouseMove = (e: KonvaMouseEvent | KonvaTouchEvent) => {
		// no drawing - skipping
		if (!isDrawing) {
			return
		}
		const stage = e.target.getStage()
		const point = stage?.getPointerPosition() || { x: 0, y: 0 }
		let lastLine = lines[lines.length - 1]
		// add point
		lastLine.points = lastLine.points.concat([point.x, point.y])

		// replace last
		lines.splice(lines.length - 1, 1, lastLine)
		lines = lines.concat()
	}

	const handleMouseUp = () => {
		isDrawing = false
	}

	const handldeSubmit = async () => {
		if (stageElement) {
			const blob = (await stageElement.node.toBlob()) as Blob
			const file = new File([blob], 'drawing.png', {
				type: 'image/png',
			})
			addDrawing(file)
		}
	}
</script>

<Popover.Root>
	<Popover.Trigger
		class={cn(buttonVariants({ variant: 'ghost' }), 'h-10 w-10')}>
		<BrushIcon />
	</Popover.Trigger>
	<Popover.Content class="relative w-fit">
		{#if lines.length <= 0}
			<div
				class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-lg">
				Draw Here
			</div>
		{/if}
		<Stage
			width={400}
			height={400}
			onmousedown={handleMouseDown}
			onmousemove={handleMouseMove}
			onmouseup={handleMouseUp}
			ontouchstart={handleMouseDown}
			ontouchmove={handleMouseMove}
			ontouchend={handleMouseUp}
			bind:this={stageElement}>
			<Layer>
				{#each lines as line, i}
					<Line
						key={i}
						points={line.points}
						stroke={line.stroke}
						strokeWidth={5}
						tension={0.5}
						lineCap="round"
						lineJoin="round"
						globalCompositeOperation={line.tool === 'eraser'
							? 'destination-out'
							: 'source-over'} />
				{/each}
			</Layer>
		</Stage>
		<div class="flex w-full items-center justify-center gap-2">
			<Button
				variant="outline"
				onclick={() => {
					lines = []
				}}>
				Clear
			</Button>
			<Button onclick={handldeSubmit}>Submit</Button>
			<ColorPicker
				bind:hex
				label=""
				position="responsive"
				--cp-bg-color="#121212"
				--cp-border-color="#121212"
				--cp-input-color="#212121"
				--cp-text-color="#fff"
				--cp-button-hover-color="#2e2e2e" />
		</div>
	</Popover.Content>
</Popover.Root>
