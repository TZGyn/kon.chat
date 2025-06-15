import { tool } from 'ai'
import { z } from 'zod'
import { jinaRead } from '$api/ai/jina'

export const web_reader = () =>
	tool({
		description: 'Get page content as markdown given an url.',
		parameters: z.object({
			url: z.string().describe('The url of the page'),
		}),
		execute: async ({ url }) => {
			try {
				const result = await jinaRead(url)
				return { result }
			} catch (error) {
				console.error('Jina reader error:', error)
				throw error
			}
		},
	})
