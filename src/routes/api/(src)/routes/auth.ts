import { Hono } from 'hono'
// For extending the Zod schema with OpenAPI properties
import 'zod-openapi/extend'
import { getCookie, setCookie } from 'hono/cookie'
import {
	createSession,
	deleteSessionTokenCookie,
	generateSessionToken,
	invalidateSession,
	setSessionTokenCookie,
	validateSessionToken,
} from '$api/auth/session'
import {
	decodeIdToken,
	generateCodeVerifier,
	generateState,
	OAuth2Tokens,
} from 'arctic'
import { github, google } from '$api/auth/provider'
import { db } from '$api/db'
import { user } from '$api/db/schema'
import { redis } from '$api/redis'
import { type Limit } from '$api/ratelimit'
import { eq } from 'drizzle-orm'
import { describeRoute } from 'hono-openapi'

const app = new Hono()
	.get('/me', describeRoute({ tags: ['auth'] }), async (c) => {
		const token = getCookie(c, 'session') ?? null

		if (token === null) {
			return c.json({ user: null })
		}

		if (token.startsWith('free:')) {
			let limit = await redis.get<Limit>(token + '-limit')
			if (!limit) return c.json({ user: null })

			return c.json({
				user: {
					email: '',
					name: '',
					plan: 'trial',
					avatar: '',
					credits: limit.credits,
					purchased_credits: limit.purchased_credits,
				},
			})
		}

		const { session, user } = await validateSessionToken(token)

		if (!user) {
			return c.json({ user: null })
		}

		if (session !== null) {
			setSessionTokenCookie(c, token, session.expiresAt)
		} else {
			deleteSessionTokenCookie(c)
		}

		const currentUser = await db.query.user.findFirst({
			where: (userTable, { eq }) => eq(userTable.id, user.id),
			with: {
				sessions: {
					where: (session, { gte }) =>
						gte(session.expiresAt, Date.now()),
				},
			},
		})

		if (currentUser) {
			await Promise.all(
				currentUser.sessions.map(async (session) => {
					await redis.set<Limit>(
						session.id + '-limit',
						{
							plan: currentUser.plan,
							credits: currentUser.credits,
							purchased_credits: currentUser.purchasedCredits,
						},
						{ ex: 60 * 60 * 24 },
					)
				}),
			)
		}

		return c.json({
			user: user
				? {
						email: user.email,
						name: user.username,
						plan: user.plan,
						avatar: user.avatar,
						credits: user.credits,
						purchased_credits: user.purchasedCredits,
						name_for_llm: user.nameForLLM,
						additional_system_prompt: user.additionalSystemPrompt,
					}
				: null,
		})
	})

	.post('/logout', describeRoute({}), async (c) => {
		const token = getCookie(c, 'session') ?? null

		if (token === null) {
			return c.json({ user: null })
		}

		const { session, user } = await validateSessionToken(token)

		if (!user) {
			return c.json({}, 401)
		}

		if (session !== null) {
			setSessionTokenCookie(c, token, session.expiresAt)
		} else {
			deleteSessionTokenCookie(c)
		}

		await invalidateSession(user.id)
		deleteSessionTokenCookie(c)

		return c.json({}, 200)
	})

	.get('/login/google', describeRoute({}), (c) => {
		const redirect = c.req.query('redirect')

		const state = encodeURI(
			JSON.stringify({ key: generateState(), redirect: redirect }),
		)

		const codeVerifier = generateCodeVerifier()
		const url = google.createAuthorizationURL(state, codeVerifier, [
			'openid',
			'profile',
			'email',
		])

		setCookie(c, 'google_oauth_state', state, {
			path: '/',
			httpOnly: true,
			maxAge: 60 * 10, // 10 minutes
			sameSite: 'lax',
		})
		setCookie(c, 'google_code_verifier', codeVerifier, {
			path: '/',
			httpOnly: true,
			maxAge: 60 * 10, // 10 minutes
			sameSite: 'lax',
		})

		return c.redirect(url.toString(), 302)
	})

	.get('/login/google/callback', describeRoute({}), async (c) => {
		const code = c.req.query('code')
		const state = c.req.query('state')
		const storedState = getCookie(c, 'google_oauth_state') ?? null
		const codeVerifier = getCookie(c, 'google_code_verifier') ?? null
		if (
			code === undefined ||
			state === undefined ||
			storedState === null ||
			codeVerifier === null
		) {
			return new Response(null, {
				status: 400,
			})
		}
		if (state !== storedState) {
			return new Response(null, {
				status: 400,
			})
		}

		let tokens: OAuth2Tokens
		try {
			tokens = await google.validateAuthorizationCode(
				code,
				codeVerifier,
			)
		} catch (e) {
			// Invalid code or client credentials
			return new Response(null, {
				status: 400,
			})
		}
		const claims = decodeIdToken(tokens.idToken())
		// @ts-ignore
		const googleUserId = claims.sub
		// @ts-ignore
		const username = claims.name
		// @ts-ignore
		const email = claims.email
		// @ts-ignore
		const avatar = claims.picture

		const existingUser = await db.query.user.findFirst({
			where: (user, { eq }) => eq(user.email, email),
		})

		const redirectUrl =
			(JSON.parse(decodeURI(state)).redirect as string | null) || '/'

		if (existingUser) {
			if (existingUser.googleId === null) {
				await db
					.update(user)
					.set({
						googleId: googleUserId,
						avatar: existingUser.avatar ? undefined : avatar,
					})
					.where(eq(user.id, existingUser.id))
			}
			if (!existingUser.avatar) {
				await db
					.update(user)
					.set({
						avatar: avatar,
					})
					.where(eq(user.id, existingUser.id))
			}
			const sessionToken = generateSessionToken()
			const session = await createSession(
				sessionToken,
				existingUser.id,
			)
			setSessionTokenCookie(c, sessionToken, session.expiresAt)
			return c.redirect(redirectUrl, 302)
		}

		const createdUser = (
			await db
				.insert(user)
				.values({
					id: generateSessionToken(),
					googleId: googleUserId,
					username: username,
					email: email,
					plan: 'free',
					credits: 0,
					purchasedCredits: 5000,
					createdAt: Date.now(),
				})
				.returning()
		)[0]

		const sessionToken = generateSessionToken()
		const session = await createSession(sessionToken, createdUser.id)
		setSessionTokenCookie(c, sessionToken, session.expiresAt)

		return c.redirect(redirectUrl, 302)
	})

	.get('/login/github', (c) => {
		const redirect = c.req.query('redirect')

		const state = encodeURI(
			JSON.stringify({ key: generateState(), redirect: redirect }),
		)

		const url = github.createAuthorizationURL(state, ['user:email'])

		setCookie(c, 'github_oauth_state', state, {
			path: '/',
			httpOnly: true,
			maxAge: 60 * 10, // 10 minutes
			sameSite: 'lax',
		})

		return c.redirect(url.toString(), 302)
	})

	.get('/login/github/callback', async (c) => {
		const code = c.req.query('code')
		const state = c.req.query('state')
		const storedState = getCookie(c, 'github_oauth_state') ?? null
		if (
			code === undefined ||
			state === undefined ||
			storedState === null
		) {
			return new Response(null, {
				status: 400,
			})
		}
		if (state !== storedState) {
			return new Response(null, {
				status: 400,
			})
		}

		let tokens: OAuth2Tokens
		try {
			tokens = await github.validateAuthorizationCode(code)
		} catch (e) {
			// Invalid code or client credentials
			return new Response(null, {
				status: 400,
			})
		}
		const githubUserResponse = await fetch(
			'https://api.github.com/user',
			{
				headers: {
					Authorization: `Bearer ${tokens.accessToken()}`,
				},
			},
		)
		const githubUser = await githubUserResponse.json()
		const githubUserId = githubUser.id
		const username = githubUser.login
		const email = githubUser.email
		const avatar = githubUser.avatar_url

		const existingUser = await db.query.user.findFirst({
			where: (user, { eq }) => eq(user.email, email),
		})

		const redirectUrl =
			(JSON.parse(decodeURI(state)).redirect as string | null) || '/'

		if (existingUser) {
			if (existingUser.githubId === null) {
				await db
					.update(user)
					.set({
						githubId: githubUserId,
						avatar: existingUser.avatar ? undefined : avatar,
					})
					.where(eq(user.id, existingUser.id))
			}
			if (!existingUser.avatar) {
				await db
					.update(user)
					.set({
						avatar: avatar,
					})
					.where(eq(user.id, existingUser.id))
			}
			const sessionToken = generateSessionToken()
			const session = await createSession(
				sessionToken,
				existingUser.id,
			)
			setSessionTokenCookie(c, sessionToken, session.expiresAt)
			return c.redirect(redirectUrl, 302)
		}

		const createdUser = (
			await db
				.insert(user)
				.values({
					id: generateSessionToken(),
					githubId: githubUserId,
					username: username,
					email: email,
					plan: 'free',
					credits: 0,
					purchasedCredits: 5000,
					createdAt: Date.now(),
				})
				.returning()
		)[0]

		const sessionToken = generateSessionToken()
		const session = await createSession(sessionToken, createdUser.id)
		setSessionTokenCookie(c, sessionToken, session.expiresAt)

		return c.redirect(redirectUrl, 302)
	})

export { app as AuthRoutes }
