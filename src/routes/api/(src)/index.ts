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
import { auth } from '$api/auth'

const app = new Hono<{
	Variables: {
		user: typeof auth.$Infer.Session.user | null
		session: typeof auth.$Infer.Session.session | null
	}
}>()
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
		const session = await auth.api.getSession({
			headers: c.req.raw.headers,
		})

		if (!session) {
			c.set('user', null)
			c.set('session', null)
			return next()
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

export const api = new Hono().route('/api', app)

export type Router = typeof router
