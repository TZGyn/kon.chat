type ChartData = PieChartData | OtherChartsData

type OtherChartsData = {
	columns: 1 | 2
	data: { x: any; y: any }[]
	title: string
	description: string
	type: 'bar' | 'area' | 'line'
	xLabel: string
	yLabel: string
	color: string
}

type PieChartData = {
	columns: 1 | 2
	data: { x: any; y: any; color: string }[]
	title: string
	description: string
	type: 'pie'
	xLabel: string
	yLabel: string
}
