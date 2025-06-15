import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import {
	deleteSessionTokenCookie,
	setSessionTokenCookie,
	validateSessionToken,
} from '$api/auth/session'
import { Polar } from '@polar-sh/sdk'
import { db } from '$api/db'
import { user as userTable } from '$api/db/schema'
import { eq } from 'drizzle-orm'
import { Checkout, CustomerPortal } from '@polar-sh/hono'

const polar = new Polar({
	accessToken: Bun.env.POLAR_ACCESS_KEY,
	server: Bun.env.APP_ENV === 'production' ? 'production' : 'sandbox',
})

const app = new Hono()

app.get('/plan/basic', async (c) => {
	const token = getCookie(c, 'session') ?? null

	if (token === null || token.startsWith('free:')) {
		return c.redirect(
			'/auth/login/google?redirect=/billing/plan/basic',
			302,
		)
	}

	const { session, user } = await validateSessionToken(token)

	if (!user) {
		return c.redirect('/auth/login/google', 302)
	}

	if (session !== null) {
		setSessionTokenCookie(c, token, session.expiresAt)
	} else {
		deleteSessionTokenCookie(c)
	}

	let polarCustomerId = user.polarCustomerId

	if (!polarCustomerId) {
		const result = await polar.customers.create({
			email: user.email,
			metadata: {
				customerId: user.id,
			},
		})

		await db
			.update(userTable)
			.set({
				polarCustomerId: result.id,
			})
			.where(eq(userTable.id, user.id))

		polarCustomerId = result.id
	}

	return c.redirect(
		`/billing/checkout?productPriceId=${Bun.env.POLAR_BASIC_PLAN_PRICE_ID}&customerId=${polarCustomerId}`,
		302,
	)
})

app.get('/plan/pro', async (c) => {
	const token = getCookie(c, 'session') ?? null

	if (token === null || token.startsWith('free:')) {
		return c.redirect(
			'/auth/login/google?redirect=/billing/plan/pro',
			302,
		)
	}

	const { session, user } = await validateSessionToken(token)

	if (!user) {
		return c.redirect('/auth/login/google', 302)
	}

	if (session !== null) {
		setSessionTokenCookie(c, token, session.expiresAt)
	} else {
		deleteSessionTokenCookie(c)
	}

	let polarCustomerId = user.polarCustomerId

	if (!polarCustomerId) {
		const result = await polar.customers.create({
			email: user.email,
			metadata: {
				customerId: user.id,
			},
		})

		await db
			.update(userTable)
			.set({
				polarCustomerId: result.id,
			})
			.where(eq(userTable.id, user.id))

		polarCustomerId = result.id
	}

	return c.redirect(
		`/billing/checkout?productPriceId=${Bun.env.POLAR_PRO_PLAN_PRICE_ID}&customerId=${polarCustomerId}`,
		302,
	)
})

app.get('/one-time/500', async (c) => {
	const token = getCookie(c, 'session') ?? null

	if (token === null || token.startsWith('free:')) {
		return c.redirect(
			'/auth/login/google?redirect=/billing/one-time/500',
			302,
		)
	}

	const { session, user } = await validateSessionToken(token)

	if (!user) {
		return c.redirect('/auth/login/google', 302)
	}

	if (session !== null) {
		setSessionTokenCookie(c, token, session.expiresAt)
	} else {
		deleteSessionTokenCookie(c)
	}

	let polarCustomerId = user.polarCustomerId

	if (!polarCustomerId) {
		const result = await polar.customers.create({
			email: user.email,
			metadata: {
				customerId: user.id,
			},
		})

		await db
			.update(userTable)
			.set({
				polarCustomerId: result.id,
			})
			.where(eq(userTable.id, user.id))

		polarCustomerId = result.id
	}

	return c.redirect(
		`/billing/checkout?productPriceId=${Bun.env.POLAR_500_CREDITS_PRICE_ID}&customerId=${polarCustomerId}`,
		302,
	)
})

app.get(
	'/checkout',
	Checkout({
		accessToken: Bun.env.POLAR_ACCESS_KEY, // Or set an environment variable to POLAR_ACCESS_TOKEN
		successUrl: Bun.env.POLAR_SUCCESS_URL,
		server:
			Bun.env.APP_ENV === 'production' ? 'production' : 'sandbox', // Use sandbox if you're testing Polar - omit the parameter or pass 'production' otherwise
	}),
)

app.get(
	'/portal',
	CustomerPortal({
		accessToken: Bun.env.POLAR_ACCESS_KEY, // Or set an environment variable to POLAR_ACCESS_TOKEN
		getCustomerId: async (event) => {
			const token = getCookie(event, 'session') ?? null

			if (token === null) {
				return ''
			}
			const { session, user } = await validateSessionToken(token)

			if (!user) {
				return ''
			}

			if (session !== null) {
				setSessionTokenCookie(event, token, session.expiresAt)
			} else {
				deleteSessionTokenCookie(event)
			}

			return user.polarCustomerId || ''
		}, // Function to resolve a Polar Customer ID
		server:
			Bun.env.APP_ENV === 'production' ? 'production' : 'sandbox', // Use sandbox if you're testing Polar - omit the parameter or pass 'production' otherwise
	}),
)

app.get(
	'/checkout',
	Checkout({
		accessToken: Bun.env.POLAR_ACCESS_KEY,
		successUrl: Bun.env.FRONTEND_URL + '/',
		server:
			Bun.env.APP_ENV === 'production' ? 'production' : 'sandbox',
	}),
)

export { app as BillingRoutes }
