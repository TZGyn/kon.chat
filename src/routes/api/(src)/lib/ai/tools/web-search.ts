import { type DataStreamWriter, tool } from 'ai'
import { z } from 'zod'
import { tavily } from '$api/ai/tavily'

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
	dataStream,
}: {
	dataStream: DataStreamWriter
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
			searchDepth: z.array(
				z
					.enum(['basic', 'advanced'])
					.describe('Array of search depths to use.'),
			),
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
			searchDepth,
			exclude_domains,
		}: {
			queries: string[]
			maxResults: number[]
			topics: ('general' | 'news')[]
			searchDepth: ('basic' | 'advanced')[]
			exclude_domains?: string[]
		}) => {
			const includeImageDescriptions = true

			// Execute searches in parallel
			const searchPromises = queries.map(async (query, index) => {
				const data = await tavily.search(query, {
					topic: topics[index] || topics[0] || 'general',
					days: topics[index] === 'news' ? 7 : undefined,
					maxResults: maxResults[index] || maxResults[0] || 10,
					searchDepth:
						searchDepth[index] || searchDepth[0] || 'basic',
					includeAnswer: true,
					includeImages: true,
					includeImageDescriptions: includeImageDescriptions,
					excludeDomains: exclude_domains,
				})

				// Add annotation for query completion
				dataStream.writeMessageAnnotation({
					type: 'query_completion',
					data: {
						query,
						index,
						total: queries.length,
						status: 'completed',
						resultsCount: data.results.length,
						imagesCount: data.images.length,
					},
				})

				return {
					query,
					results: deduplicateByDomainAndUrl(data.results).map(
						(obj: any) => ({
							url: obj.url,
							title: obj.title,
							content: obj.content,
							raw_content: obj.raw_content,
							published_date:
								topics[index] === 'news'
									? obj.published_date
									: undefined,
						}),
					),
					images: includeImageDescriptions
						? await Promise.all(
								deduplicateByDomainAndUrl(data.images).map(
									async ({
										url,
										description,
									}: {
										url: string
										description?: string
									}) => {
										const sanitizedUrl = sanitizeUrl(url)
										const isValid =
											await isValidImageUrl(sanitizedUrl)
										return isValid
											? {
													url: sanitizedUrl,
													description: description ?? '',
												}
											: null
									},
								),
							).then((results) =>
								results.filter(
									(
										image,
									): image is {
										url: string
										description: string
									} =>
										image !== null &&
										typeof image === 'object' &&
										typeof image.description === 'string' &&
										image.description !== '',
								),
							)
						: await Promise.all(
								deduplicateByDomainAndUrl(data.images).map(
									async ({ url }: { url: string }) => {
										const sanitizedUrl = sanitizeUrl(url)
										return (await isValidImageUrl(sanitizedUrl))
											? sanitizedUrl
											: null
									},
								),
							).then(
								(results) =>
									results.filter((url) => url !== null) as string[],
							),
				}
			})

			const searchResults = await Promise.all(searchPromises)

			return {
				searches: searchResults,
			}
		},
	})
