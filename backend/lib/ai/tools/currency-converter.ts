import { tool } from 'ai'
import { z } from 'zod'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

export const currency_converter = () =>
	tool({
		description:
			'Convert currency from one to another using yfinance',
		parameters: z.object({
			from: z.string().describe('The source currency code.'),
			to: z.string().describe('The target currency code.'),
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
			amount: z
				.number()
				.describe(
					'The amount to convert. Default to 1 if not specified by user.',
				),
		}),
		execute: async ({
			from,
			to,
			period,
			amount,
		}: {
			from: string
			to: string
			period: string
			amount: number
		}) => {
			let forwardRate = null
			let reverseRate = null
			let convertedAmount = null

			try {
				const newExec = promisify(exec)
				const { stderr, stdout } = await newExec(
					`python ./backend/lib/ai/tools/currency-converter.py ${from} ${to} ${period}`,
				)

				// console.log('stdout', stdout)
				// console.log('stderr', stderr)
				const lines = stdout.split('\n')
				// console.log(lines)

				for (const line of lines) {
					if (line.includes('Forward rate:')) {
						forwardRate = JSON.parse(line.split(': ')[1])
					}
					if (line.includes('Reverse rate:')) {
						reverseRate = JSON.parse(line.split(': ')[1])
					}
					//   if (line.includes('Converted amount:')) {
					//     convertedAmount = parseFloat(line.split(': ')[1]);
					//   }
				}
			} catch (error) {
				console.error(`exec error: ${error}`)
			}

			if (forwardRate) {
				const close = forwardRate['Close']
				const rate = parseFloat(
					close[Object.keys(close)[Object.keys(close).length - 1]],
				)
				convertedAmount = amount * rate
			}

			return {
				forwardRate: forwardRate,
				reverseRate: reverseRate,
				fromCurrency: from,
				toCurrency: to,
				amount: amount,
				convertedAmount: convertedAmount,
				period,
			}
		},
	})
