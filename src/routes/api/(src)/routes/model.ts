import { db } from '$api/db'
import { model, user } from '$api/db/schema'
// For extending the Zod schema with OpenAPI properties
import 'zod-openapi/extend'
import { resolver, validator as zValidator } from 'hono-openapi/zod'
import { Hono } from 'hono'

import { z } from 'zod'
import { nanoid } from '$lib/nanoid'
import { and, eq } from 'drizzle-orm'

import { env } from '$env/dynamic/private'
import type { auth } from '$api/auth'

const app = new Hono<{
	Variables: {
		user: typeof auth.$Infer.Session.user | null
		session: typeof auth.$Infer.Session.session | null
	}
}>()
	.get('/', async (c) => {
		const loggedInUser = c.get('user')

		if (!loggedInUser) {
			return c.json({}, 401)
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
					'google',
					'anthropic',
					'open_router',
					'xai',
				]),
				model: z.string(),
				image: z.boolean(),
				file: z.boolean(),
				fast: z.boolean(),
				reasoning: z.boolean(),
				searchGrounding: z.boolean(),
			}),
		),
		async (c) => {
			const loggedInUser = c.get('user')

			if (!loggedInUser) {
				return c.json({}, 401)
			}

			const {
				model: modelInput,
				provider,
				fast,
				file,
				image,
				reasoning,
				searchGrounding,
			} = c.req.valid('json')

			await db.insert(model).values({
				id: nanoid(),
				model: modelInput,
				provider: provider,
				userId: loggedInUser.id,
				fast,
				file,
				image,
				reasoning,
				searchGrounding,
			})

			return c.json({ success: true }, 200)
		},
	)
	.put(
		'/:model_id',
		zValidator(
			'json',
			z.object({
				provider: z.enum([
					'openai',
					'google',
					'anthropic',
					'open_router',
					'xai',
				]),
				model: z.string(),
				image: z.boolean(),
				file: z.boolean(),
				fast: z.boolean(),
				reasoning: z.boolean(),
				searchGrounding: z.boolean(),
			}),
		),
		async (c) => {
			const loggedInUser = c.get('user')

			if (!loggedInUser) {
				return c.json({}, 401)
			}

			const modelId = c.req.param('model_id')

			const {
				model: modelInput,
				provider,
				fast,
				file,
				image,
				reasoning,
				searchGrounding,
			} = c.req.valid('json')

			await db
				.update(model)
				.set({
					model: modelInput,
					provider: provider,
					userId: loggedInUser.id,
					fast,
					file,
					image,
					reasoning,
					searchGrounding,
				})
				.where(
					and(
						eq(model.id, modelId),
						eq(model.userId, loggedInUser.id),
					),
				)

			return c.json({ success: true }, 200)
		},
	)
	.delete('/:model_id', async (c) => {
		const loggedInUser = c.get('user')

		if (!loggedInUser) {
			return c.json({}, 401)
		}

		const modelId = c.req.param('model_id')

		await db
			.delete(model)
			.where(
				and(eq(model.id, modelId), eq(model.userId, loggedInUser.id)),
			)

		return c.json({ success: false }, 200)
	})
	.get('/available_models', async (c) => {
		const loggedInUser = c.get('user')

		if (!loggedInUser) {
			return c.json({}, 401)
		}

		const {
			OPENAI_API_KEY,
			CLAUDE_API_KEY,
			GEMINI_API_KEY,
			GROQ_API_KEY,
			XAI_API_KEY,
			MISTRAL_API_KEY,
			OPENROUTER_API_KEY,
		} = env

		const available_models: (
			| 'openai'
			| 'anthropic'
			| 'google'
			| 'groq'
			| 'xai'
			| 'mistral'
			| 'open_router'
		)[] = []

		if (OPENAI_API_KEY) {
			available_models.push('openai')
		}
		if (CLAUDE_API_KEY) {
			available_models.push('anthropic')
		}
		if (GEMINI_API_KEY) {
			available_models.push('google')
		}
		if (GROQ_API_KEY) {
			available_models.push('groq')
		}
		if (XAI_API_KEY) {
			available_models.push('xai')
		}
		if (MISTRAL_API_KEY) {
			available_models.push('mistral')
		}
		if (OPENROUTER_API_KEY) {
			available_models.push('open_router')
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

		return c.json(
			{
				success: true,
				custom_models: user.models.filter((model) => {
					return available_models.includes(model.provider as any)
				}),
			},
			200,
		)
	})

export { app as ModelRoutes }
