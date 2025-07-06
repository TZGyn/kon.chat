import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'

// For extending the Zod schema with OpenAPI properties
import 'zod-openapi/extend'
import { openAPISpecs } from 'hono-openapi'
import { Scalar } from '@scalar/hono-api-reference'

import { AuthRoutes } from './routes/auth'
import { UserRoutes } from './routes/user'
import { ChatRoutes } from './routes/chat'
import { FileUploadRoutes } from './routes/file-upload'
import { WebhookRoutes } from './routes/webhook'
import { DocumentsRoutes } from './routes/document'
import { YoutubeRoutes } from './routes/youtube'
import { WebsiteRoutes } from './routes/website'
import { AdminRoutes } from './routes/admin'

import { PUBLIC_APP_URL } from '$env/static/public'
import { ModelRoutes } from './routes/model'
import type { AuthType } from '$api/auth/type'
import { getCookie } from 'hono/cookie'
import {
	deleteSessionTokenCookie,
	setSessionTokenCookie,
	validateSessionToken,
} from '$api/auth/session'

const app = new Hono<{ Variables: AuthType }>()
app.use(cors())
app.use(logger())

app.get('/', (c) => {
	return c.redirect('/')
})

app.get(
	'/openapi',
	openAPISpecs(app, {
		documentation: {
			info: {
				title: 'Hono',
				version: '1.0.0',
				description: 'API for greeting users',
			},
			servers: [
				{
					url: PUBLIC_APP_URL + '/api',
					description: 'Local server',
				},
			],
		},
	}),
)

app.get(
	'/docs',
	Scalar({
		theme: 'saturn',
		url: '/api/openapi',
	}),
)

const router = app
	.use('*', async (c, next) => {
		if (c.req.path.startsWith('/api/auth')) {
			return next()
		}
		console.log(c.req.path)
		const token = getCookie(c, 'session') ?? null

		if (token === null) {
			return c.json({ success: false }, 401)
		}

		const { session, user } = await validateSessionToken(token)

		if (!user) {
			return c.json({ success: false }, 401)
		}

		if (session !== null) {
			setSessionTokenCookie(c, token, session.expiresAt)
		} else {
			deleteSessionTokenCookie(c)
		}

		if (!session) {
			return c.json({ success: false }, 401)
		}

		c.set('user', user)
		c.set('session', session)
		return next()
	})
	.route('/auth', AuthRoutes)
	.route('/user', UserRoutes)
	.route('/model', ModelRoutes)
	.route('/chat', ChatRoutes)
	.route('/file-upload', FileUploadRoutes)
	.route('/webhook', WebhookRoutes)
	.route('/documents', DocumentsRoutes)
	.route('/youtube', YoutubeRoutes)
	.route('/website', WebsiteRoutes)
	.route('/admin', AdminRoutes)

export const api = new Hono().route('/api', app)

export type Router = typeof router
