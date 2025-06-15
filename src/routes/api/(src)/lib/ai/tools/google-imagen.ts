import { validateSessionToken } from '$api/auth/session'
import { generateText, tool } from 'ai'
import { z } from 'zod'
import { google } from '$api/ai/model'
import { nanoid } from '$api/utils'
import { db } from '$api/db'
import { s3Client } from '$api/s3'
import { upload } from '$api/db/schema'

export const image_generation = ({
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

				if (!loggedInUser)
					return {
						error: {
							type: 'unauthenticated',
							message: 'Must Be Logged In To Use This Feature',
							message_to_llm:
								'Please let your request user know they must be logged in to use this feature',
						},
					}

				const result = await generateText({
					model: google('gemini-2.0-flash-exp'),
					providerOptions: {
						google: { responseModalities: ['TEXT', 'IMAGE'] },
					},
					messages: [
						{
							role: 'user',
							content: [
								{ type: 'text', text: prompt },
								...(image_url
									? [{ type: 'image' as const, image: image_url }]
									: []),
							],
						},
					],
				})

				const files: string[] = []
				for (const file of result.files) {
					if (file.mimeType.startsWith('image/')) {
						// show the image
						const extension = file.mimeType.split('/')[1]
						const id = `${
							loggedInUser.id
						}/chat/${chatId}/upload/${nanoid()}-generated_image.${extension}`

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

						await s3file.write(file.uint8Array)

						const uploadId = nanoid() + `.${extension}`

						await db.insert(upload).values({
							id: uploadId,
							userId: loggedInUser.id,
							key: id,
							mimeType: file.mimeType,
							name: 'generated_image.' + extension,
							size: file.uint8Array.byteLength,
							visibility: existingChat.visibility,
							createdAt: Date.now(),
						})

						files.push(Bun.env.APP_URL + '/file-upload/' + uploadId)
					}
				}

				return { files }
			} catch (error) {
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
