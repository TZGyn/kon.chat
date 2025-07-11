import { Hono } from 'hono'
import { db } from '$api/db'
import {
	convertToCoreMessages,
	createDataStream,
	smoothStream,
	streamText,
} from 'ai'
import { google, openai } from '$api/ai/model'
import { Innertube } from 'youtubei.js'
import { z } from 'zod'
import { youtube } from '$api/db/schema'
import { stream } from 'hono/streaming'
import { zValidator } from '@hono/zod-validator'
import { getCookie } from 'hono/cookie'
import { getMostRecentUserMessage } from '$api/utils'
// import { type TranscriptSegment } from 'youtubei.js/dist/src/parser/nodes'
import { getModel, modelSchema } from '$api/model'

// https://stackoverflow.com/questions/19700283/how-to-convert-time-in-milliseconds-to-hours-min-sec-format-in-javascript
function msToTime(duration: number) {
	var milliseconds = Math.floor((duration % 1000) / 100),
		seconds = Math.floor((duration / 1000) % 60),
		minutes = Math.floor((duration / (1000 * 60)) % 60),
		hours = Math.floor((duration / (1000 * 60 * 60)) % 24)

	var result = ''

	if (hours > 0) {
		result += hours + ':'
	}

	return (
		result +
		(minutes < 10 ? '0' : '') +
		minutes +
		':' +
		(seconds < 10 ? '0' : '') +
		seconds
		// +
		// '.' +
		// milliseconds
	)
}

const app = new Hono()
	.get('/:youtube_id', async (c) => {
		let token = getCookie(c, 'session') ?? null
		if (!token || token.startsWith('free:')) {
			return c.text('You must be logged in to use this feature', {
				status: 400,
			})
		}
		const youtube_id = c.req.param('youtube_id')

		const youtubeData = await db.query.youtube.findFirst({
			where: (youtube, { eq }) => eq(youtube.id, youtube_id),
		})

		if (youtubeData) {
			c.header('Content-Type', 'application/json')
			return c.json({ youtube: youtubeData })
		}

		return stream(c, (stream) =>
			stream.pipe(
				createDataStream({
					execute: async (dataStream) => {
						let info
						try {
							const innerTube = await Innertube.create({
								lang: 'en',
								retrieve_player: false,
							})

							info = await innerTube.getInfo(youtube_id)
						} catch (error) {
							dataStream.writeData({
								type: 'error',
								message: 'Invalid Youtube Link',
							})
							return
						}
						const title = info.primary_info?.title.text
						const description = info.secondary_info?.description
						const channelName = info.basic_info.channel?.name
						const channelUrl = info.basic_info.channel?.url
						const uploadTime = info.primary_info?.published
						const channelThumbnailUrl =
							info.secondary_info?.owner?.author.best_thumbnail
								?.url || ''

						dataStream.writeData({
							type: 'youtube_info',
							info: {
								title: title || '',
								description: description?.toString() || '',
								descriptionHTML: description?.toHTML() || '',
								channelName: channelName || '',
								channelUrl: channelUrl || '',
								uploadTime: uploadTime?.toString() || '',
								channelThumbnailUrl,
							},
						})
						const transcriptData = await info.getTranscript()

						const transcript =
							transcriptData.transcript.content?.body?.initial_segments
								.filter(
									(segment) =>
										segment.type !== 'TranscriptSectionHeader',
								)
								.map((segment) => segment) || []

						dataStream.writeData({
							type: 'youtube_transcript',
							transcript: JSON.stringify(transcript),
						})

						const result = streamText({
							model: openai('gpt-4.1-mini'),
							system: `
							- You will be given a transcript of a video
							- The transcript will be in {start timestamp}-{end timestamp}:{text} format for each line
							- timestamp and only be in these format: h:mm:ss or mm:ss, where h is hour, mm is minute and ss is seconds
							- You will generate a summary of the video
							- do not use quotes or colons
							- only return the summary
							- cite your summary with timestamps using the format h:mm:ss
							- minute and second must be 2 digits, so if for example second is 1, you must make it 01

							example for timestamps:
							if hours is 0, minute is 10, seconds is 2: 10:02
							if hours is 1, minute is 1, seconds is 15: 1:01:15

							wrap the timestamp between [], ie: [10:01]
							if only one timestamp is provided, ie: only start timestamp
							wrap the timestamp between []: [10:01]
							if 2 or more timestamps are provided, ie: start to end timestamp
							wrap them between [] separately: [00:01] - [10:11]

							if a math equation is generated, wrap it around $ for katex inline styling and $$ for block
							example:

							(inline) 
							Pythagorean theorem: $a^2+b^2=c^2$

							(block)
							$$
							\mathcal{L}\{f\}(s) = \int_0^{\infty} {f(t)e^{-st}dt}
							$$

							This video has a title of ${title}
							The video channel name is ${channelName}
							Upload date is ${uploadTime}
						`,
							prompt: transcript
								.filter(
									(segment) =>
										segment.type !== 'TranscriptSectionHeader',
								)
								.map(
									(segment) =>
										`${msToTime(Number(segment.start_ms))}-${msToTime(
											Number(segment.end_ms),
										)}:${segment.snippet.text}`,
								)
								.join('\n'),
							experimental_transform: smoothStream({
								delayInMs: 10, // optional: defaults to 10ms
								chunking: 'word', // optional: defaults to 'word'
							}),
							onFinish: async ({ usage, response, text }) => {
								const youtubeData = await db.query.youtube.findFirst({
									where: (youtube, { eq }) =>
										eq(youtube.id, youtube_id),
								})
								if (youtubeData) return

								await db.insert(youtube).values({
									id: youtube_id,
									channelName: channelName || '',
									channelUrl: channelUrl || '',
									channelThumbnailUrl: channelThumbnailUrl,
									description: description?.toString() || '',
									descriptionHTML: description?.toHTML() || '',
									summary: text,
									uploadTime: uploadTime?.toString() || '',
									title: title || '',
									transcript: transcript,
									createdAt: Date.now(),
								})
							},
						})

						result.mergeIntoDataStream(dataStream)
					},
				}),
			),
		)
	})

	.post(
		'/:youtube_id',
		zValidator(
			'json',
			z.object({
				messages: z.any(),
				provider: modelSchema,
				transcript: z.custom<any>().array(),
				searchGrounding: z.boolean().default(false),
			}),
		),
		async (c) => {
			const youtube_id = c.req.param('youtube_id')

			const { provider, searchGrounding, transcript, messages } =
				c.req.valid('json')

			let coreMessages = convertToCoreMessages(messages)
			const userMessage = getMostRecentUserMessage(coreMessages)

			if (!userMessage) {
				return c.text('No User Message', { status: 400 })
			}

			const { model, error, providerOptions } = getModel({
				provider,
				searchGrounding,
			})

			if (error !== null) {
				return c.text(error, 400)
			}

			return stream(c, (stream) =>
				stream.pipe(
					createDataStream({
						execute: async (dataStream) => {
							dataStream.writeMessageAnnotation({
								type: 'model',
								model: provider.model,
							})

							dataStream.writeData({
								type: 'message',
								message: 'Understanding prompt',
							})

							dataStream.writeData({
								type: 'message',
								message: 'Generating Response',
							})

							const result = streamText({
								model: model,
								messages: coreMessages,
								system: `
								You are a youtube chat assistant
								${
									!searchGrounding &&
									`
										Dont call any tools as there are no tools
										Only use the information provided to you
										If theres is a need for search, the search result will be provided to you
									`
								}

								- You will be given the transcript of the video to help you answer the user prompts
								- The transcript will be in {start timestamp}-{end timestamp}:{text} format for each line
								- timestamp and only be in these format: h:mm:ss or mm:ss, where h is hour, mm is minute and ss is seconds
								- cite your summary with timestamps using the format h:mm:ss
								- minute and second must be 2 digits, so if for example second is 1, you must make it 01

								example for timestamps:
								if hours is 0, minute is 10, seconds is 2: 10:02
								if hours is 1, minute is 1, seconds is 15: 1:01:15

								wrap the timestamp between [], ie: [10:01]
								if only one timestamp is provided, ie: only start timestamp
								wrap the timestamp between []: [10:01]
								if 2 or more timestamps are provided, ie: start to end timestamp
								wrap them between [] separately: [00:01] - [10:11]

								if a math equation is generated, wrap it around $$ for katex inline styling and $$ for block
								example:

								(inline) 
								Pythagorean theorem: $$a^2+b^2=c^2$$

								(block)
								$$
								\mathcal{L}\{f\}(s) = \int_0^{\infty} {f(t)e^{-st}dt}
								$$

								Here is the transcript:
								${JSON.stringify(
									transcript.map(
										(segment) =>
											`${msToTime(
												Number(segment.start_ms),
											)}-${msToTime(Number(segment.end_ms))}:${
												segment.snippet.text
											}`,
									),
								)}
							`,
								providerOptions,
								onChunk: ({ chunk }) => {},
								onStepFinish: (data) => {},
								onError: (error) => {
									console.log(error)
								},
								experimental_transform: smoothStream({
									delayInMs: 20, // optional: defaults to 10ms
									chunking: 'word', // optional: defaults to 'word'
								}),
								onFinish: async ({
									response,
									usage,
									reasoning,
									providerMetadata,
								}) => {},
							})

							result.mergeIntoDataStream(dataStream, {
								sendReasoning: true,
							})
						},
						onError: (error) => {
							// Error messages are masked by default for security reasons.
							// If you want to expose the error message to the client, you can do so here:
							console.log(error)
							return error instanceof Error
								? error.message
								: String(error)
						},
					}),
				),
			)
		},
	)

export { app as YoutubeRoutes }
