import { db } from '$api/db'
import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
// For extending the Zod schema with OpenAPI properties
import 'zod-openapi/extend'
import { validator as zValidator } from 'hono-openapi/zod'
import { z } from 'zod'
import { message } from '$api/db/schema'
import { eq } from 'drizzle-orm'
import { env } from '$env/dynamic/private'

const app = new Hono().post(
	'/migrate_message_assets',
	describeRoute({ tags: ['admin'] }),
	zValidator(
		'json',
		z.object({
			oldUrl: z.string().url(),
			newUrl: z.string().url(),
			addPathPrefix: z.string().optional(),
			password: z.string(),
		}),
	),
	async (c) => {
		const {
			newUrl: newUrlInput,
			oldUrl: oldUrlInput,
			addPathPrefix,
			password,
		} = c.req.valid('json')

		const admin_password = env.ADMIN_PASSWORD
		if (!admin_password || password !== admin_password) {
			return c.json({ success: false }, 400)
		}

		const messages = await db.query.message.findMany({
			columns: {
				id: true,
			},
		})

		await Promise.all(
			messages
				.map((message) => message.id)
				.map(async (id) => {
					const existingMessage = await db.query.message.findFirst({
						where: (message, t) => t.eq(message.id, id),
					})

					if (!existingMessage) {
						return
					}

					let newContent = existingMessage.content

					console.log('OLD CONTENT:', existingMessage.content)

					if (typeof newContent === 'string') {
						console.log('Skipped...')
						return
					}

					if (Array.isArray(newContent)) {
						for (const content of newContent) {
							if (content.type === 'text') {
								continue
							} else if (content.type === 'reasoning') {
								continue
							} else if (content.type === 'tool-call') {
								continue
							} else if (content.type === 'image') {
								const url = content.image as string

								if (url.startsWith(oldUrlInput)) {
									const newUrl = new URL(url)
									newUrl.hostname = new URL(newUrlInput).hostname
									if (addPathPrefix) {
										newUrl.pathname = addPathPrefix + newUrl.pathname
									}
									content.image = newUrl.href
								}

								continue
							} else if (content.type === 'file') {
								const url = content.data as string

								if (url.startsWith(oldUrlInput)) {
									const newUrl = new URL(url)
									newUrl.hostname = new URL(newUrlInput).hostname
									if (addPathPrefix) {
										newUrl.pathname = addPathPrefix + newUrl.pathname
									}
									content.image = newUrl.href
								}
							} else if (
								content.type === 'tool-result' &&
								'files' in content.result
							) {
								content.result.files = (
									content.result.files as string[]
								).map((url) => {
									if (url.startsWith(oldUrlInput)) {
										const newUrl = new URL(url)
										newUrl.hostname = new URL(newUrlInput).hostname
										if (addPathPrefix) {
											newUrl.pathname =
												addPathPrefix + newUrl.pathname
										}
										return newUrl.href
									}
									return url
								})
							}
						}
					}

					console.log('NEW CONTENT:', newContent)

					await db
						.update(message)
						.set({
							content: newContent,
						})
						.where(eq(message.id, existingMessage.id))
				}),
		)
		return c.json({ success: true }, 200)
	},
)

export { app as AdminRoutes }
