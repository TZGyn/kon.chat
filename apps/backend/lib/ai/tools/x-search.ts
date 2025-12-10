import { tool } from 'ai'
import { z } from 'zod'
import Exa from 'exa-js'

type XResult = {
	id: string
	url: string
	title: string
	author?: string
	publishedDate?: string
	text: string
	highlights?: string[]
	tweetId: string
}

export const x_search = ({ apiKey }: { apiKey: string }) =>
	tool({
		description: 'Search X (formerly Twitter) posts.',
		parameters: z.object({
			query: z
				.string()
				.describe(
					'The search query, if a username is provided put in the query with @username',
				),
			startDate: z
				.string()
				.optional()
				.describe(
					'The start date for the search in YYYY-MM-DD format',
				),
			endDate: z
				.string()
				.optional()
				.describe('The end date for the search in YYYY-MM-DD format'),
		}),
		execute: async ({
			query,
			startDate,
			endDate,
		}: {
			query: string
			startDate?: string
			endDate?: string
		}) => {
			const exa = new Exa(apiKey)
			try {
				const result = await exa.searchAndContents(query, {
					type: 'keyword',
					numResults: 15,
					text: true,
					highlights: true,
					includeDomains: ['twitter.com', 'x.com'],
					startPublishedDate: startDate,
					endPublishedDate: endDate,
				})
				// Extract tweet ID from URL
				const extractTweetId = (url: string): string | null => {
					const match = url.match(
						/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/,
					)
					return match ? match[1] : null
				}
				// Process and filter results
				const processedResults = result.results.reduce<
					Array<XResult>
				>((acc, post) => {
					const tweetId = extractTweetId(post.url)
					if (tweetId) {
						acc.push({
							...post,
							tweetId,
							title: post.title || '',
						})
					}
					return acc
				}, [])
				return processedResults
			} catch (error) {
				console.error('X search error:', error)
				throw error
			}
		},
	})
