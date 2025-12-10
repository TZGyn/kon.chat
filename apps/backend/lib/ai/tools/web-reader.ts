import { tool } from 'ai'
import { z } from 'zod'
import Exa from 'exa-js'

export const web_reader = ({ apiKey }: { apiKey: string }) =>
	tool({
		description: 'Get page content as markdown given an url.',
		parameters: z.object({
			url: z.string().describe('The url of the page'),
		}),
		execute: async ({ url }) => {
			try {
				const exa = new Exa(apiKey)
				const result = await exa.getContents([url])

				return { result }
			} catch (error) {
				console.error('Exa web reader error:', error)
				throw error
			}
		},
	})
