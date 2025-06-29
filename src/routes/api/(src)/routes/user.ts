import {
	deleteSessionTokenCookie,
	setSessionTokenCookie,
	validateSessionToken,
} from '$api/auth/session'
import { db } from '$api/db'
import { user } from '$api/db/schema'
// For extending the Zod schema with OpenAPI properties
import 'zod-openapi/extend'
import { resolver, validator as zValidator } from 'hono-openapi/zod'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { z } from 'zod'
import { env } from '$env/dynamic/private'

const app = new Hono()
	.post(
		'/settings',
		zValidator(
			'json',
			z.object({
				name: z.string().max(50),
				additional_system_prompt: z.string().max(1000),
			}),
		),
		async (c) => {
			const token = getCookie(c, 'session') ?? null

			if (token === null) {
				return c.json({ success: false })
			}

			const { session, user: loggedInUser } =
				await validateSessionToken(token)

			if (!loggedInUser) {
				return c.json({ success: false })
			}

			if (session !== null) {
				setSessionTokenCookie(c, token, session.expiresAt)
			} else {
				deleteSessionTokenCookie(c)
			}

			const { additional_system_prompt, name } = c.req.valid('json')

			await db
				.update(user)
				.set({
					nameForLLM: name,
					additionalSystemPrompt: additional_system_prompt,
				})
				.where(eq(user.id, loggedInUser.id))

			return c.json({ success: true })
		},
	)
	.get('/available_models', async (c) => {
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

		return c.json({ available_models }, 200)
	})

export { app as UserRoutes }
