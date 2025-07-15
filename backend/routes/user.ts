import { db } from '$api/db'
import { setting, user } from '$api/db/schema'
// For extending the Zod schema with OpenAPI properties
import 'zod-openapi/extend'
import { validator as zValidator } from 'hono-openapi/zod'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
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

		const existingSettings = await db.query.setting.findFirst({
			where: (setting, { eq }) => eq(setting.userId, user.id),
		})

		if (!existingSettings) {
			return c.json({
				settings: (
					await db
						.insert(setting)
						.values({
							userId: user.id,
						})
						.returning()
				)[0],
			})
		}

		return c.json({ settings: existingSettings })
	})
	.post(
		'/settings',
		zValidator(
			'json',
			z.object({
				name: z.string().max(50).optional(),
				additional_system_prompt: z.string().max(1000).optional(),
				openai_api_key: z.string().optional().nullable(),
				anthropic_api_key: z.string().optional().nullable(),
				google_api_key: z.string().optional().nullable(),
				open_router_api_key: z.string().optional().nullable(),
				xai_api_key: z.string().optional().nullable(),
				mistral_api_key: z.string().optional().nullable(),

				exa_api_key: z.string().optional().nullable(),
			}),
		),
		async (c) => {
			const session = c.get('session')
			const loggedInUser = c.get('user')

			if (!loggedInUser) {
				return c.json({ success: false }, 401)
			}

			const {
				additional_system_prompt,
				name,
				anthropic_api_key,
				google_api_key,
				open_router_api_key,
				openai_api_key,
				mistral_api_key,
				xai_api_key,

				exa_api_key,
			} = c.req.valid('json')

			await db
				.update(setting)
				.set({
					nameForLLM: name,
					additionalSystemPrompt: additional_system_prompt,
					claudeApiKey: anthropic_api_key,
					geminiApiKey: google_api_key,
					openAIApiKey: openai_api_key,
					openRouterApiKey: open_router_api_key,
					mistralApiKey: mistral_api_key,
					xaiApiKey: xai_api_key,

					exaApiKey: exa_api_key,
				})
				.where(eq(setting.userId, loggedInUser.id))

			return c.json({ success: true })
		},
	)
	.get('/capabilties', async (c) => {
		const {
			OPENAI_API_KEY,
			CLAUDE_API_KEY,
			GEMINI_API_KEY,
			XAI_API_KEY,
			MISTRAL_API_KEY,
			OPENROUTER_API_KEY,

			EXA_API_KEY,
		} = Bun.env

		const user = c.get('user')

		if (!user) return c.json({}, 401)

		const userSettings = await db.query.setting.findFirst({
			where: (setting, t) => t.eq(setting.userId, user.id),
		})

		const available_providers: (
			| 'openai'
			| 'anthropic'
			| 'google'
			| 'xai'
			| 'mistral'
			| 'open_router'
		)[] = []

		if (OPENAI_API_KEY || !!userSettings?.openAIApiKey) {
			available_providers.push('openai')
		}
		if (CLAUDE_API_KEY || !!userSettings?.claudeApiKey) {
			available_providers.push('anthropic')
		}
		if (GEMINI_API_KEY || !!userSettings?.geminiApiKey) {
			available_providers.push('google')
		}
		if (XAI_API_KEY || !!userSettings?.xaiApiKey) {
			available_providers.push('xai')
		}
		if (MISTRAL_API_KEY || !!userSettings?.mistralApiKey) {
			available_providers.push('mistral')
		}
		if (OPENROUTER_API_KEY || !!userSettings?.openRouterApiKey) {
			available_providers.push('open_router')
		}

		const search = !!EXA_API_KEY

		return c.json({
			available_providers,
			search,
		})
	})

export { app as UserRoutes }
