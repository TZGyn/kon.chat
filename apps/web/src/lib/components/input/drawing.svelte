<script lang="ts">
	import * as Popover from '$lib/components/ui/popover/index.js'
	import { cn } from '$lib/utils'
	import { BrushIcon } from '@lucide/svelte'
	import {
		Stage,
		Layer,
		Line,
		Rect,
		type KonvaMouseEvent,
		type KonvaTouchEvent,
	} from 'svelte-konva'
	import { buttonVariants } from '../ui/button'
	import Button from '$lib/components/ui/button/button.svelte'
	import ColorPicker from 'svelte-awesome-color-picker'
	import * as m from '$lib/paraglide/messages'
	import { mode } from 'mode-watcher'

	let {
		addDrawing,
		disabled,
	}: {
		addDrawing: (drawing: File) => void
		disabled: boolean
	} = $props()

	let stageElement = $state<Stage>()
	let tool = $state<'pen' | 'eraser'>('pen')
	let isDrawing = $state(false)
	let lines = $state<
		{ tool: 'pen' | 'eraser'; points: number[]; stroke: string }[]
	>([])
	let hex = $state('#000')
	let backgroundHex = $state('#fff')

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
	<Popover.Content class="relative w-fit space-y-4">
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
				<Rect
					x={0}
					y={0}
					width={400}
					height={400}
					stroke={'#000'}
					fill={backgroundHex}></Rect>
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
		<div
			class="flex w-full items-center justify-center gap-2 rounded p-2">
			<ColorPicker
				bind:hex
				label={m.foreground()}
				position="responsive"
				isDark={mode.current === 'dark'} />
			<ColorPicker
				bind:hex={backgroundHex}
				label={m.background()}
				position="responsive"
				isDark={mode.current === 'dark'} />
			<Button
				variant="outline"
				onclick={() => {
					lines = []
				}}>
				{m.clear()}
			</Button>
			<Button onclick={handldeSubmit}>{m.submit()}</Button>
		</div>
	</Popover.Content>
</Popover.Root>

<style>
	:root {
		--cp-text-color: #000;
		--cp-border-color: #e5e5e5;
	}
	:global(.dark) {
		--cp-bg-color: #121212;
		--cp-border-color: #121212;
		--cp-input-color: #212121;
		--cp-text-color: #fff;
		--cp-button-hover-color: #2e2e2e;
	}
</style>
