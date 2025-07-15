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

import { ModelRoutes } from './routes/model'
import { auth } from '$api/auth'

const app = new Hono<{
	Variables: {
		user: typeof auth.$Infer.Session.user
		session: typeof auth.$Infer.Session.session
	}
}>()
app.use(
	cors({
		origin: Bun.env.PUBLIC_APP_URL,
		credentials: true,
	}),
)
app.use(logger())

app.get('/', (c) => {
	return c.text('hello')
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
					url: Bun.env.PUBLIC_API_URL,
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
		url: '/openapi',
	}),
)

const router = app
	.use('*', async (c, next) => {
		const session = await auth.api.getSession({
			headers: c.req.raw.headers,
		})

		if (
			c.req.path.startsWith('/auth') ||
			c.req.path.startsWith('/file-upload')
		) {
			return next()
		}

		if (!session) {
			return c.body(null, 401)
		}

		c.set('user', session.user)
		c.set('session', session.session)
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

export const api = app

export type Router = typeof router

export default {
	port: 3000,
	fetch: app.fetch,
}
