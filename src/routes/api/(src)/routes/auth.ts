import { Hono } from 'hono'
// For extending the Zod schema with OpenAPI properties
import 'zod-openapi/extend'
import { auth } from '$api/auth'

const app = new Hono().on(['POST', 'GET'], '/*', (c) => {
	return auth.handler(c.req.raw)
})

export { app as AuthRoutes }
