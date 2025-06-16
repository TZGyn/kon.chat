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
import { BillingRoutes } from './routes/billing'
import { DocumentsRoutes } from './routes/document'
import { YoutubeRoutes } from './routes/youtube'
import { VersionRoutes } from './routes/version'
import { WebsiteRoutes } from './routes/website'

const app = new Hono()
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
					url: Bun.env.PUBLIC_APP_URL + '/api',
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

app.route('/auth', AuthRoutes)
app.route('/user', UserRoutes)
app.route('/chat', ChatRoutes)
app.route('/file-upload', FileUploadRoutes)
app.route('/webhook', WebhookRoutes)
app.route('/billing', BillingRoutes)
app.route('/documents', DocumentsRoutes)
app.route('/youtube', YoutubeRoutes)
app.route('/version', VersionRoutes)
app.route('/website', WebsiteRoutes)

export const api = new Hono().route('/api', app)
