import { db } from '$api/db'
import { Hono } from 'hono'
import { describeRoute } from 'hono-openapi'
// For extending the Zod schema with OpenAPI properties
import 'zod-openapi/extend'
import { validator as zValidator } from 'hono-openapi/zod'
import { z } from 'zod'

const app = new Hono().post(
	'/migrate_message_assets',
	describeRoute({}),
	zValidator(
		'json',
		z.object({
			oldUrl: z.string().url(),
			newUrl: z.string().url(),
			password: z.string(),
		}),
	),
	async (c) => {
		const {
			newUrl: newUrlInput,
			oldUrl: oldUrlInput,
			password,
		} = c.req.valid('json')

		const admin_password = Bun.env.ADMIN_PASSWORD
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
					const message = await db.query.message.findFirst({
						where: (message, t) => t.eq(message.id, id),
					})

					if (!message) {
						return
					}

					let newContent = message.content

					if (typeof newContent === 'string') {
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
									content.image = newUrl.href
								}

								continue
							} else if (content.type === 'file') {
								const url = content.data as string

								if (url.startsWith(oldUrlInput)) {
									const newUrl = new URL(url)
									newUrl.hostname = new URL(newUrlInput).hostname
									content.image = newUrl.href
								}
							} else if (
								content.type === 'tool-result' &&
								'files' in content.result
							) {
								const files: string[] = []
								for (const url of content.result.files as string[]) {
									if (url.startsWith(oldUrlInput)) {
										const id = (url as string).split('/').pop()

										if (!id) continue
										files.push(id)
									}
								}
								content.result.files = (
									content.result.files as string[]
								).map((url) => {
									if (url.startsWith(oldUrlInput)) {
										const newUrl = new URL(url)
										newUrl.hostname = new URL(newUrlInput).hostname
										return newUrl.href
									}
									return url
								})
							}
						}
					}
				}),
		)
		return c.json({ success: true }, 200)
	},
)

export { app as AdminRoutes }
