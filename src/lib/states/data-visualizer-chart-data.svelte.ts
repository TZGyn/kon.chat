let chartData: ChartData[] = $state([])

export const getChartDataState = () => {
	return {
		get chartData() {
			return chartData
		},
		set chartData(value) {
			chartData = value
		},
	}
}
