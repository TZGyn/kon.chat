import { Hono } from "hono";
import { serveStatic } from 'hono/bun'

const app = new Hono()
app.use('/*', serveStatic({ root: './build' }))
app.get('/*', serveStatic({path: './build/404.html'}))

export default {
	port: 8080,
	fetch: app.fetch,
	idleTimeout: 0,
}
