import type { AuthType } from '$api/auth'
import { createOpenAI } from '@ai-sdk/openai'
import { zValidator } from '@hono/zod-validator'
import {
	createDataStreamResponse,
	type FilePart,
	type ImagePart,
	smoothStream,
	streamText,
} from 'ai'
import { Hono } from 'hono'
import { z } from 'zod'

const app = new Hono<{
	Variables: AuthType
}>().post(
	'/',
	zValidator(
		'form',
		z.object({
			prompt: z.string(),
			currentHtml: z.string(),
			userAvatar: z.string().optional(),
			file: z
				.instanceof(File)
				.refine((file) => file.size <= 5 * 1024 * 1024, {
					message: 'File size should be less than 5MB',
				})
				// Update the file type based on the kind of files you want to accept
				.refine(
					(file) =>
						[
							'image/jpeg',
							'image/png',
							'application/pdf',
							// 'text/csv',
							// 'text/plain',
						].includes(file.type),
					{
						message: 'File type not supported',
					},
				)
				.optional(),
		}),
	),
	async (c) => {
		const { prompt, file, currentHtml, userAvatar } =
			c.req.valid('form')

		const settings = c.get('setting')
		if (!settings.openAIApiKey) {
			return c.text('Missing OpenAI Api Key', { status: 400 })
		}

		const apiKey = settings.openAIApiKey

		const openai = createOpenAI({
			apiKey: apiKey,
		})

		return createDataStreamResponse({
			execute: async (dataStream) => {
				const fileParts = await Promise.all(
					(file ? [file] : []).map(async (file) => {
						if (file.type === 'application/pdf') {
							return {
								type: 'file',
								mimeType: file.type,
								data: await file.arrayBuffer(),
							} as FilePart
						}
						return {
							type: 'image',
							image: await file.arrayBuffer(),
						} as ImagePart
					}),
				)
				const result = streamText({
					model: openai('gpt-4.1-mini'),
					messages: [
						{
							role: 'user',
							content: [
								{ type: 'text', text: prompt },
								{
									type: 'text',
									text: 'Do not return the html in codeblock, no triple tilde, only the html content',
								},
								{
									type: 'text',
									text: `Current HTML: ${currentHtml}`,
								},
								...fileParts,
							],
						},
					],
					system: `
						You are a webpage assistant, you will be asked to generate html page according to the user prompt
						You will also be given the current html, which can be empty if starting fresh

						Today's Date: ${new Date().toLocaleDateString('en-US', {
							year: 'numeric',
							month: 'short',
							day: '2-digit',
							weekday: 'short',
						})}

						Tech you should be using by default:
						- tailwindcss (add https://cdn.tailwindcss.com to head)
						- jquery (add https://code.jquery.com/jquery-3.7.1.min.js to head)
						
						User may provider images/pdfs to generate the web page
						Example: use this image as reference to generate my website, I have my resume as pdf and I would like you to generate a landing page with it

						Make sure to only return the html content
						- No codeblock (no triple tilde)
						- No chat
						- Only html

						Also, try to ellaborate as much as you can, to create something unique. 
						Make them into a landing page style
						ALWAYS GIVE THE RESPONSE INTO A SINGLE HTML FILE

						${
							userAvatar
								? `The user has also provided their avatar link, use this if necessary. Here is the link: ${userAvatar}`
								: ''
						}
					`,
					abortSignal: c.req.raw.signal,
					onChunk: ({ chunk }) => {},
					maxSteps: 5,
					// experimental_activeTools: [...activeTools(mode)],
					onError: (error) => {
						console.log('Error', error)
					},
					experimental_transform: smoothStream({
						delayInMs: 10, // optional: defaults to 10ms
						chunking: 'line', // optional: defaults to 'word'
					}),
					onFinish: async ({
						response,
						usage,
						reasoning,
						providerMetadata,
						finishReason,
					}) => {
						// updateUserChatAndLimit({
						// 	chatId,
						// 	messages: response.messages,
						// 	provider,
						// 	providerMetadata,
						// 	reasoning,
						// 	token,
						// 	usage,
						// 	userMessage,
						// 	userMessageDate,
						// 	mode,
						// 	response_id: response.id,
						// })
					},
				})

				result.mergeIntoDataStream(dataStream, {
					sendReasoning: true,
				})
			},
			onError: (error) => {
				// Error messages are masked by default for security reasons.
				// If you want to expose the error message to the client, you can do so here:
				console.log('Stream Error', error)
				return error instanceof Error ? error.message : String(error)
			},
		})
	},
)

export { app as WebsiteRoutes }
