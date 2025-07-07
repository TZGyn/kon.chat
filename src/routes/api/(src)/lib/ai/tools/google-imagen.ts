import { generateText, tool } from 'ai'
import { z } from 'zod'
import { google } from '$api/ai/model'
import { nanoid } from '$api/utils'
import { db } from '$api/db'
import { s3Client } from '$api/s3'
import { upload } from '$api/db/schema'
import { PUBLIC_APP_URL } from '$env/static/public'
import type { User } from '$api/db/type'

export const image_generation = ({
	chatId,
	user,
}: {
	user: User
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
							user.id
						}/chat/${chatId}/upload/${nanoid()}-generated_image.${extension}`

						const existingChat = await db.query.chat.findFirst({
							where: (chat, t) =>
								t.and(
									t.eq(chat.id, chatId),
									t.eq(chat.userId, user.id),
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
							userId: user.id,
							key: id,
							mimeType: file.mimeType,
							name: 'generated_image.' + extension,
							size: file.uint8Array.byteLength,
							visibility: existingChat.visibility,
							createdAt: Date.now(),
						})

						files.push(
							PUBLIC_APP_URL + '/api/file-upload/' + uploadId,
						)
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
