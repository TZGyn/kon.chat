import { tool } from 'ai'
import { z } from 'zod'

export const stock_chart = () =>
	tool({
		description: 'Get stock data',
		parameters: z.object({
			symbol: z.string().describe('symbol of the stock'),
		}),
	})
