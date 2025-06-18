import { Hono } from 'hono'
// For extending the Zod schema with OpenAPI properties
import 'zod-openapi/extend'
import { getCookie } from 'hono/cookie'
import {
	deleteSessionTokenCookie,
	invalidateSession,
	setSessionTokenCookie,
	validateSessionToken,
} from '$api/auth/session'
import { db } from '$api/db'
import {
	chat,
	document,
	embeddings,
	message,
	upload,
	user,
} from '$api/db/schema'
import { redis } from '$api/redis'
import { type Limit } from '$api/ratelimit'
import { and, eq, inArray } from 'drizzle-orm'
import { describeRoute } from 'hono-openapi'
import { LoginRoutes } from './login'
import { getUploadIDsFromMessages } from '$api/chat/attachments'
import { s3Client } from '$api/s3'

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

	.delete('/account', async (c) => {
		const token = getCookie(c, 'session') ?? null

		if (token === null) {
			return c.json({ user: null })
		}

		const { session, user: loggedInUser } =
			await validateSessionToken(token)

		if (!loggedInUser) {
			return c.json({}, 401)
		}

		if (session !== null) {
			setSessionTokenCookie(c, token, session.expiresAt)
		} else {
			deleteSessionTokenCookie(c)
		}

		await invalidateSession(loggedInUser.id)
		deleteSessionTokenCookie(c)

		await db.delete(user).where(eq(user.id, loggedInUser.id))

		const chats = await db.query.chat.findMany({
			where: (chat, t) => t.and(t.eq(chat.userId, loggedInUser.id)),
		})

		if (chats.length > 0) {
			await db.delete(chat).where(
				inArray(
					chat.id,
					chats.map((chat) => chat.id),
				),
			)

			const messages = await db
				.delete(message)
				.where(
					inArray(
						message.chatId,
						chats.map((chat) => chat.id),
					),
				)
				.returning()

			const uploads = getUploadIDsFromMessages(messages)

			if (uploads.length > 0) {
				const deletedUploads = await db
					.delete(upload)
					.where(inArray(upload.id, uploads))
					.returning()

				await Promise.all(
					deletedUploads.map(async (upload) => {
						const file = s3Client.file(upload.key)
						await file.delete()
					}),
				)
			}
		}

		const documents = await db
			.delete(document)
			.where(eq(document.userId, loggedInUser.id))
			.returning()

		if (documents.length > 0) {
			await db.delete(embeddings).where(
				and(
					eq(embeddings.resourceType, 'document'),
					inArray(
						embeddings.resourceId,
						documents.map((document) => document.id),
					),
				),
			)

			const deletedUploads = await db
				.delete(upload)
				.where(
					inArray(
						upload.id,
						documents.map((document) => document.uploadId),
					),
				)
				.returning()

			await Promise.all(
				deletedUploads.map(async (upload) => {
					const file = s3Client.file(upload.key)
					await file.delete()
				}),
			)
		}

		return c.json({}, 200)
	})

app.route('/login', LoginRoutes)

export { app as AuthRoutes }
