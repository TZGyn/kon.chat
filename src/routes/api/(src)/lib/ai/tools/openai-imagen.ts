import { validateSessionToken } from '$api/auth/session'
import { tool } from 'ai'
import { z } from 'zod'
import { nanoid } from '$api/utils'
import { db } from '$api/db'
import { s3Client } from '$api/s3'
import { upload } from '$api/db/schema'
import OpenAI, { toFile } from 'openai'
import { OPENAI_API_KEY } from '$env/static/private'
import { PUBLIC_APP_URL } from '$env/static/public'

const client = new OpenAI({
	apiKey: OPENAI_API_KEY,
})

export const openai_imagen = ({
	chatId,
	token,
}: {
	token: string
	chatId: string
}) =>
	tool({
		description: 'Generate/Edit Image',
		parameters: z.object({
			prompt: z.string().describe('prompt to generate image'),
			image_url: z
				.string()
				.describe(
					'image reference/image to edit (put empty string if none)',
				),
		}),
		execute: async ({ prompt, image_url }) => {
			try {
				const { session, user: loggedInUser } =
					await validateSessionToken(token)

				if (!loggedInUser) {
					return {
						error: {
							type: 'unauthenticated',
							message: 'Must Be Logged In To Use This Feature',
							message_to_llm:
								'Please let your request user know they must be logged in to use this feature',
						},
					}
				}

				let result
				if (image_url) {
					const response = await fetch(image_url)

					if (!response.ok) {
						return {
							error: {
								type: 'image_fetch_error',
								message: 'Unable to fetch image',
								message_to_llm: 'The image url provided is broken',
							},
						}
					}

					const split = image_url.split('.')
					const mimeType = split[split.length - 1]

					result = await client.images.edit({
						model: 'gpt-image-1',
						image: await toFile(
							new Uint8Array(
								await (await fetch(image_url)).arrayBuffer(),
							),
							'input_image',
							{
								type:
									mimeType === 'png'
										? 'image/png'
										: mimeType === 'jpeg' || mimeType === 'jpg'
											? 'image/jpeg'
											: 'image/webp',
							},
						),
						prompt: prompt,
					})
				} else {
					result = await client.images.generate({
						model: 'gpt-image-1',
						prompt: prompt,
					})
				}

				const files: string[] = []
				const image_base64 = result.data?.[0].b64_json
				if (image_base64) {
					const imageBuffer = Buffer.from(image_base64, 'base64')

					const id = `${
						loggedInUser.id
					}/chat/${chatId}/upload/${nanoid()}-generated_image.png`

					const existingChat = await db.query.chat.findFirst({
						where: (chat, t) =>
							t.and(
								t.eq(chat.id, chatId),
								t.eq(chat.userId, loggedInUser.id),
							),
					})

					if (!existingChat)
						return {
							error: {
								type: 'invalid_chat',
								message: 'Invalid Chat Upload',
							},
						}

					const s3file = s3Client.file(id)

					await s3file.write(imageBuffer)

					const uploadId = nanoid() + `.png`

					await db.insert(upload).values({
						id: uploadId,
						userId: loggedInUser.id,
						key: id,
						mimeType: 'image/png',
						name: 'generated_image.png',
						size: imageBuffer.byteLength,
						visibility: existingChat.visibility,
						createdAt: Date.now(),
					})

					files.push(PUBLIC_APP_URL + '/api/file-upload/' + uploadId)
				}

				return { files }
			} catch (error) {
				console.log(error)
				return {
					error: {
						type: 'server_error',
						message: 'something wrong when generating image',
						message_to_llm:
							'Server encounters issues when generating the image',
					},
				}
			}
		},
	})
