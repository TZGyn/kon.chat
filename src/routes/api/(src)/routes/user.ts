import { db } from '$api/db'
import { setting, user } from '$api/db/schema'
// For extending the Zod schema with OpenAPI properties
import 'zod-openapi/extend'
import { resolver, validator as zValidator } from 'hono-openapi/zod'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { z } from 'zod'
import { env } from '$env/dynamic/private'
import type { AuthType } from '$api/auth'

const app = new Hono<{
	Variables: AuthType
}>()
	.get('/me', async (c) => {
		const user = c.get('user')

		if (!user) {
			return c.json({ success: false, user: null }, 401)
		}

		const setting = await db.query.setting.findFirst({
			where: (setting, { eq }) => eq(setting.userId, user.id),
		})

		return c.json({
			user: {
				...user,
				...(setting
					? setting
					: {
							nameForLLM: '',
							additionalSystemPrompt: '',
							openAIApiKey: null,
							geminiApiKey: null,
							claudeApiKey: null,
							openRouterApiKey: null,
							userId: '',
						}),
			},
		})
	})
	.get('/settings', async (c) => {
		const session = c.get('session')
		const user = c.get('user')

		if (!user) {
			return c.json({ success: false }, 401)
		}

		const setting = await db.query.setting.findFirst({
			where: (setting, { eq }) => eq(setting.userId, user.id),
		})

		return c.json({ setting })
	})
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
			const session = c.get('session')
			const loggedInUser = c.get('user')

			if (!loggedInUser) {
				return c.json({ success: false }, 401)
			}

			const { additional_system_prompt, name } = c.req.valid('json')

			await db
				.update(setting)
				.set({
					nameForLLM: name,
					additionalSystemPrompt: additional_system_prompt,
				})
				.where(eq(setting.userId, loggedInUser.id))

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
