import { db } from '../db'
import { encodeBase32, encodeHexLowerCase } from '@oslojs/encoding'
import { sha256 } from '@oslojs/crypto/sha2'

import { session } from '../db/schema'
import { eq } from 'drizzle-orm'
import { type Context } from 'hono'
import { setCookie } from 'hono/cookie'

export async function validateSessionToken(token: string) {
	const sessionId = encodeHexLowerCase(
		sha256(new TextEncoder().encode(token)),
	)
	const existingSession = await db.query.session.findFirst({
		where: (session, { eq }) => eq(session.id, sessionId),
		with: {
			user: true,
		},
	})

	if (!existingSession) {
		return { session: null, user: null }
	}

	const { user, ...sessionData } = existingSession

	if (Date.now() >= existingSession.expiresAt) {
		await db.delete(session).where(eq(session.id, sessionId))
		return { session: null, user: null }
	}
	if (
		Date.now() >=
		existingSession.expiresAt - 1000 * 60 * 60 * 24 * 15
	) {
		const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 30
		await db
			.update(session)
			.set({ expiresAt })
			.where(eq(session.id, sessionId))
	}

	return { session: sessionData, user: user }
}

export async function invalidateSession(sessionId: string) {
	await db.delete(session).where(eq(session.id, sessionId))
}

export async function invalidateUserSessions(userId: string) {
	await db.delete(session).where(eq(session.userId, userId))
}

export function setSessionTokenCookie(
	event: Context,
	token: string,
	expiresAt: number,
): void {
	setCookie(event, 'session', token, {
		httpOnly: true,
		path: '/',
		secure: Bun.env.APP_ENV === 'production',
		sameSite: 'lax',
		expires: new Date(expiresAt),
	})
}

export function deleteSessionTokenCookie(event: Context): void {
	setCookie(event, 'session', '', {
		httpOnly: true,
		path: '/',
		secure: Bun.env.APP_ENV === 'production',
		sameSite: 'lax',
		maxAge: 0,
	})
}

export function generateSessionToken(): string {
	const tokenBytes = new Uint8Array(20)
	crypto.getRandomValues(tokenBytes)
	const token = encodeBase32(tokenBytes).toLowerCase()
	return token
}

export async function createSession(token: string, userId: string) {
	const sessionId = encodeHexLowerCase(
		sha256(new TextEncoder().encode(token)),
	)

	return (
		await db
			.insert(session)
			.values({
				id: sessionId,
				userId: userId,
				expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30,
			})
			.returning()
	)[0]
}
