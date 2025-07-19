import { tool } from 'ai'
import { z } from 'zod'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

export const stock_chart = () =>
	tool({
		description: 'Get stock data',
		parameters: z.object({
			symbol: z.string().describe('symbol of the stock'),
			period: z
				.enum([
					'1d',
					'5d',
					'1mo',
					'3mo',
					'6mo',
					'1y',
					'2y',
					'5y',
					'10y',
					'ytd',
					'max',
				])
				.describe('The time range of data. Default to 1y'),
		}),
		execute: async ({
			symbol,
			period,
		}: {
			symbol: string
			period: string
		}) => {
			let prices = null
			let latestPrice = 0

			try {
				const newExec = promisify(exec)
				const { stderr, stdout } = await newExec(
					`python ./backend/lib/ai/tools/stock-chart.py ${symbol} ${period}`,
				)

				const lines = stdout.split('\n')

				for (const line of lines) {
					if (line.includes('Historical Data:')) {
						prices = JSON.parse(line.split(': ')[1])
					}
				}
			} catch (error) {
				console.error(`exec error: ${error}`)
			}

			if (prices) {
				const close = prices['Close']
				const rate = parseFloat(
					close[Object.keys(close)[Object.keys(close).length - 1]],
				)
				latestPrice = rate
			}

			return {
				prices: prices,
				symbol: symbol,
				currency: 'USD',
				locale: 'en-us',
				latestPrice: latestPrice,
				period,
			}
		},
	})
