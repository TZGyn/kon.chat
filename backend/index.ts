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
import { DataVisualizerRoutes } from './routes/data-visualizer'
import { AdminRoutes } from './routes/admin'

import { ModelRoutes } from './routes/model'
import { auth, type AuthType } from '$api/auth'
import { db } from '$api/db'
import { setting } from '$api/db/schema'
import { createBunWebSocket } from 'hono/bun'
import type { ServerWebSocket } from 'bun'
import { createRedis } from '$api/redis'

const { upgradeWebSocket, websocket } =
	createBunWebSocket<ServerWebSocket>()

const app = new Hono<{
	Variables: AuthType
}>()
app.use(
	cors({
		origin: Bun.env.PUBLIC_APP_URL!,
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
					url: Bun.env.PUBLIC_API_URL!,
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

		let settings = await db.query.setting.findFirst({
			where: (setting, t) => t.eq(setting.userId, session.user.id),
		})

		if (!settings) {
			settings = (
				await db
					.insert(setting)
					.values({
						userId: session.user.id,
					})
					.returning()
			)[0]
		}

		c.set('user', session.user)
		c.set('session', session.session)
		c.set('setting', settings)
		return next()
	})
	.get('/ws', (c) => {
		return upgradeWebSocket(c, {
			onOpen: (event, ws) => {
				const user = c.get('user')

				const streamKey = `user:${user.id}:events`
				const subscription = createRedis()

				subscription.subscribe(streamKey)
				subscription.on('message', async (channel, message) => {
					ws.send(message)
				})
			},
			onMessage(event, ws) {
				console.log(`Message from client: ${event.data}`)
				ws.send('Hello from server!')
			},
			onClose: () => {
				console.log('Connection closed')
			},
		})
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
	.route('/data-visualizer', DataVisualizerRoutes)
	.route('/admin', AdminRoutes)

export const api = app

export type Router = typeof router

export default {
	port: 8080,
	fetch: app.fetch,
	idleTimeout: 0,
	websocket,
}
