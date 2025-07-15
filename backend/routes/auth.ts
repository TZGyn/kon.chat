import { Hono } from 'hono'
// For extending the Zod schema with OpenAPI properties
import 'zod-openapi/extend'
import { auth } from '$api/auth'
import { cors } from 'hono/cors'

const app = new Hono()
	.use(
		'*', // or replace with "*" to enable cors for all routes
		cors({
			origin: '*', // replace with your origin
			allowHeaders: ['Content-Type', 'Authorization'],
			allowMethods: ['POST', 'GET', 'OPTIONS'],
			exposeHeaders: ['Content-Length'],
			maxAge: 600,
			credentials: true,
		}),
	)
	.on(['POST', 'GET'], '/*', (c) => {
		return auth.handler(c.req.raw)
	})

export { app as AuthRoutes }
