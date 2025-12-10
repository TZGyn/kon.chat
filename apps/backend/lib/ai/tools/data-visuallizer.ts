import { z } from 'zod'

const pieChartSchema = z.object({
	columns: z
		.union([z.literal(1), z.literal(2)])
		.describe(
			'How many columns is takes to display on frontend (more data = more columns)',
		),
	data: z
		.array(
			z.object({
				x: z.string(),
				y: z.string(),
				color: z
					.string()
					.describe('hex code (with #) of the pie data'),
			}),
		)
		.default([]),
	title: z.string(),
	description: z.string(),
	type: z.literal('pie'),
	xLabel: z.string(),
	yLabel: z.string(),
})

const barChartSchema = z.object({
	columns: z
		.union([z.literal(1), z.literal(2)])
		.describe(
			'How many columns is takes to display on frontend (more data = more columns)',
		),
	data: z
		.array(
			z.object({
				data: z.array(
					z.object({
						x: z.string(),
						y: z.string(),
					}),
				),
				label: z.string(),
				color: z
					.string()
					.describe('hex code (with #) of the pie data'),
			}),
		)
		.default([]),
	title: z.string(),
	description: z.string(),
	type: z.literal('bar'),
	xLabel: z.string(),
	seriesLayout: z.enum([
		'group',
		'overlap',
		'stack',
		'stackExpand',
		'stackDiverging',
	]),
	orientation: z.enum(['horizontal', 'vertical']),
})

const lineAreaChartSchema = z.object({
	columns: z
		.union([z.literal(1), z.literal(2)])
		.describe(
			'How many columns is takes to display on frontend (more data = more columns)',
		),
	data: z
		.array(
			z.object({
				data: z.array(
					z.object({
						x: z.string(),
						y: z.string(),
					}),
				),
				label: z.string(),
				color: z
					.string()
					.describe('hex code (with #) of the pie data'),
			}),
		)
		.default([]),
	title: z.string(),
	description: z.string(),
	type: z.enum(['area', 'line']),
	xLabel: z.string(),
})

export const dataVisualizerSchema = z.array(
	z.union([lineAreaChartSchema, barChartSchema, pieChartSchema]),
)

export type ChartData = z.infer<typeof dataVisualizerSchema>
export type PieChartData = z.infer<typeof pieChartSchema>
export type BarChartData = z.infer<typeof barChartSchema>
export type LineAreaChartData = z.infer<typeof lineAreaChartSchema>
