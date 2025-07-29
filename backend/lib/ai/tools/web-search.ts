import { type DataStreamWriter, tool } from 'ai'
import { z } from 'zod'
import Exa from 'exa-js'

async function isValidImageUrl(url: string): Promise<boolean> {
	try {
		const controller = new AbortController()
		const timeout = setTimeout(() => controller.abort(), 5000)

		const response = await fetch(url, {
			method: 'HEAD',
			signal: controller.signal,
		})

		clearTimeout(timeout)

		return (
			response.ok &&
			(response.headers.get('content-type')?.startsWith('image/') ??
				false)
		)
	} catch {
		return false
	}
}

function sanitizeUrl(url: string): string {
	return url.replace(/\s+/g, '%20')
}

const extractDomain = (url: string): string => {
	const urlPattern = /^https?:\/\/([^/?#]+)(?:[/?#]|$)/i
	return url.match(urlPattern)?.[1] || url
}

const deduplicateByDomainAndUrl = <T extends { url: string }>(
	items: T[],
): T[] => {
	const seenDomains = new Set<string>()
	const seenUrls = new Set<string>()

	return items.filter((item) => {
		const domain = extractDomain(item.url)
		const isNewUrl = !seenUrls.has(item.url)
		const isNewDomain = !seenDomains.has(domain)

		if (isNewUrl && isNewDomain) {
			seenUrls.add(item.url)
			seenDomains.add(domain)
			return true
		}
		return false
	})
}

export const web_search = ({
	writeMessageAnnotation,
	apiKey,
}: {
	writeMessageAnnotation: (value: any) => Promise<void>
	apiKey: string
}) =>
	tool({
		description:
			'Search the web for information with multiple queries, max results and search depth. Note: This is different from google search grounding, so dont call this if youre using google search grounding',
		parameters: z.object({
			queries: z.array(
				z
					.string()
					.describe('Array of search queries to look up on the web.'),
			),
			maxResults: z.array(
				z
					.number()
					.describe(
						'Array of maximum number of results to return per query.',
					),
			),
			topics: z.array(
				z
					.enum(['general', 'news'])
					.describe('Array of topic types to search for.'),
			),
			include_domains: z
				.array(z.string())
				.describe(
					'A list of domains to include in all search results. Default is an empty list.',
				)
				.optional(),
			exclude_domains: z
				.array(z.string())
				.describe(
					'A list of domains to exclude from all search results.',
				)
				.optional(),
		}),
		execute: async ({
			queries,
			maxResults,
			topics,
			include_domains,
			exclude_domains,
		}: {
			queries: string[]
			maxResults: number[]
			topics: ('general' | 'news' | 'finance')[]
			include_domains?: string[]
			exclude_domains?: string[]
		}) => {
			const exa = new Exa(apiKey)

			// Execute searches in parallel
			const searchPromises = queries.map(async (query, index) => {
				const currentTopic = topics[index] || topics[0] || 'general'
				const currentMaxResults =
					maxResults[index] || maxResults[0] || 10

				const searchOptions: any = {
					text: true,
					type: 'auto',
					numResults: currentMaxResults < 10 ? 10 : currentMaxResults,
					livecrawl: 'preferred',
					useAutoprompt: true,
					category:
						currentTopic === 'finance'
							? 'financial report'
							: currentTopic === 'news'
								? 'news'
								: '',
				}

				// if (include_domains && include_domains.length > 0) {
				//   searchOptions.includeDomains = include_domains;
				// }
				if (exclude_domains && exclude_domains.length > 0) {
					searchOptions.excludeDomains = exclude_domains
				}

				const data = await exa.searchAndContents(query, searchOptions)

				const images: { url: string; description: string }[] = []
				const results = data.results.map((result: any) => {
					if (result.image) {
						images.push({
							url: result.image,
							description:
								result.title ||
								result.text?.substring(0, 100) + '...' ||
								'',
						})
					}

					return {
						url: result.url,
						title: result.title || '',
						content: (result.text || '').substring(0, 1000),
						published_date:
							currentTopic === 'news' && result.publishedDate
								? result.publishedDate
								: undefined,
						author: result.author || undefined,
					}
				})

				// Add annotation for query completion
				writeMessageAnnotation({
					type: 'query_completion',
					data: {
						query,
						index,
						total: queries.length,
						status: 'completed',
						resultsCount: results.length,
						imagesCount: images.length,
					},
				})

				return {
					query,
					results: deduplicateByDomainAndUrl(data.results),
					images: images.filter((img) => img.url && img.description),
				}
			})

			const searchResults = await Promise.all(searchPromises)

			return {
				searches: searchResults,
			}
		},
	})
