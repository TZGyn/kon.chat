import {
	deleteSessionTokenCookie,
	setSessionTokenCookie,
	validateSessionToken,
} from '$api/auth/session'
import { db } from '$api/db'
import { model, user } from '$api/db/schema'
// For extending the Zod schema with OpenAPI properties
import 'zod-openapi/extend'
import { resolver, validator as zValidator } from 'hono-openapi/zod'
import { Hono } from 'hono'

import { getCookie } from 'hono/cookie'
import { z } from 'zod'
import { nanoid } from '$lib/nanoid'
import { and, eq } from 'drizzle-orm'

const app = new Hono()
	.get('/', async (c) => {
		const token = getCookie(c, 'session') ?? null

		if (token === null) {
			return c.json({ success: false }, 401)
		}

		const { session, user: loggedInUser } =
			await validateSessionToken(token)

		if (!loggedInUser) {
			return c.json({ success: false }, 401)
		}

		if (session !== null) {
			setSessionTokenCookie(c, token, session.expiresAt)
		} else {
			deleteSessionTokenCookie(c)
		}

		const user = await db.query.user.findFirst({
			where: (user, t) => t.eq(user.id, loggedInUser.id),
			with: {
				models: true,
			},
		})

		if (!user) {
			return c.json({ success: false }, 401)
		}

		return c.json({ success: true, models: user.models })
	})
	.post(
		'/',
		zValidator(
			'json',
			z.object({
				provider: z.enum([
					'openai',
					'gemini',
					'claude',
					'open_router',
					'xai',
				]),
				model: z.string(),
			}),
		),
		async (c) => {
			const token = getCookie(c, 'session') ?? null

			if (token === null) {
				return c.json({ success: false }, 401)
			}

			const { session, user: loggedInUser } =
				await validateSessionToken(token)

			if (!loggedInUser) {
				return c.json({ success: false }, 401)
			}

			if (session !== null) {
				setSessionTokenCookie(c, token, session.expiresAt)
			} else {
				deleteSessionTokenCookie(c)
			}

			const { model: modelInput, provider } = c.req.valid('json')

			await db.insert(model).values({
				id: nanoid(),
				model: modelInput,
				provider: provider,
				userId: loggedInUser.id,
			})

			return c.json({ success: true }, 200)
		},
	)
	.delete('/:model_id', async (c) => {
		const token = getCookie(c, 'session') ?? null

		if (token === null) {
			return c.json({ success: false }, 401)
		}

		const { session, user: loggedInUser } =
			await validateSessionToken(token)

		if (!loggedInUser) {
			return c.json({ success: false }, 401)
		}

		if (session !== null) {
			setSessionTokenCookie(c, token, session.expiresAt)
		} else {
			deleteSessionTokenCookie(c)
		}

		const modelId = c.req.param('model_id')

		await db
			.delete(model)
			.where(
				and(eq(model.id, modelId), eq(model.userId, loggedInUser.id)),
			)

		return c.json({ success: false }, 200)
	})

export { app as ModelRoutes }
