import { Hono } from 'hono'
// For extending the Zod schema with OpenAPI properties
import 'zod-openapi/extend'
import { getCookie, setCookie } from 'hono/cookie'
import {
	createSession,
	generateSessionToken,
	setSessionTokenCookie,
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
import { eq } from 'drizzle-orm'
import { describeRoute } from 'hono-openapi'

const app = new Hono()
	.get('/google', describeRoute({ tags: ['auth'] }), (c) => {
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

	.get(
		'/google/callback',
		describeRoute({ tags: ['auth'] }),
		async (c) => {
			const code = c.req.query('code')
			const state = c.req.query('state')
			const storedState = getCookie(c, 'google_oauth_state') ?? null
			const codeVerifier =
				getCookie(c, 'google_code_verifier') ?? null
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
				(JSON.parse(decodeURI(state)).redirect as string | null) ||
				'/'

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
						createdAt: Date.now(),
					})
					.returning()
			)[0]

			const sessionToken = generateSessionToken()
			const session = await createSession(
				sessionToken,
				createdUser.id,
			)
			setSessionTokenCookie(c, sessionToken, session.expiresAt)

			return c.redirect(redirectUrl, 302)
		},
	)

	.get('/github', describeRoute({ tags: ['auth'] }), (c) => {
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

	.get(
		'/github/callback',
		describeRoute({ tags: ['auth'] }),
		async (c) => {
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
				(JSON.parse(decodeURI(state)).redirect as string | null) ||
				'/'

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
						createdAt: Date.now(),
					})
					.returning()
			)[0]

			const sessionToken = generateSessionToken()
			const session = await createSession(
				sessionToken,
				createdUser.id,
			)
			setSessionTokenCookie(c, sessionToken, session.expiresAt)

			return c.redirect(redirectUrl, 302)
		},
	)

export { app as LoginRoutes }
