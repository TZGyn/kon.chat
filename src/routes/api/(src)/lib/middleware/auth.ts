import {
	deleteSessionTokenCookie,
	setSessionTokenCookie,
	validateSessionToken,
} from '$api/auth/session'
import type { User } from '$api/db/type'
import { getCookie } from 'hono/cookie'
import { createMiddleware } from 'hono/factory'

export const authMiddleware = createMiddleware<{
	Variables: {
		user: User
	}
}>(async (c, next) => {
	const token = getCookie(c, 'session') ?? null

	if (token === null) {
		return c.json({ error: { message: 'Unauthenticated' } }, 400)
	}

	const { session, user } = await validateSessionToken(token)

	if (!user) {
		return c.json({ error: { message: 'Unauthenticated' } }, 400)
	}

	if (session !== null) {
		setSessionTokenCookie(c, token, session.expiresAt)
	} else {
		deleteSessionTokenCookie(c)
	}

	c.set('user', user)
	await next()
})
