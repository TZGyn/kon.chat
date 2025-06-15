import { generateId } from 'ai'
import { type Context } from 'hono'
import { getCookie } from 'hono/cookie'
import {
	deleteSessionTokenCookie,
	setSessionTokenCookie,
	validateSessionToken,
} from '$api/auth/session'
import { redis } from '$api/redis'
import { encodeHexLowerCase } from '@oslojs/encoding'
import { sha256 } from '@oslojs/crypto/sha2'
import { type User } from '$api/db/type'
import {
	premiumModels,
	type Provider,
	standardModels,
} from '$api/model'
import { user } from '$api/db/schema'
import { eq, sql } from 'drizzle-orm'
import { db } from '$api/db'
import { calculateCost, costTable } from './credits/cost'
import { type Tool } from './ai/tools'

export type Limit = {
	plan: 'free' | 'basic' | 'pro' | 'owner' | 'trial'
	credits: number
	purchased_credits: number
}

export const checkRatelimit = async ({
	c,
	provider,
	mode,
}: {
	c: Context
	provider: Provider
	mode: Tool
}) => {
	let token = getCookie(c, 'session') ?? null
	let cookie: 'none' | 'set' | 'delete' = 'none'
	if (!token) {
		token = `free:${generateId()}`
		cookie = 'set'
		await redis.set<Limit>(
			token + '-limit',
			{
				plan: 'trial',
				credits: 0,
				purchased_credits: 0,
			},
			{ ex: 60 * 60 * 24 },
		)
	}

	let limit = await redis.get<Limit>(
		(token.startsWith('free:')
			? token
			: encodeHexLowerCase(sha256(new TextEncoder().encode(token)))) +
			'-limit',
	)

	if (!limit) {
		if (token.startsWith('free:')) {
			return { error: 'You have been rate limited' }
		} else {
			const { session, user } = await validateSessionToken(token)
			if (!user) return { error: 'Invalid User' }

			if (session !== null) {
				cookie = 'set'
			} else {
				cookie = 'delete'
			}

			limit = {
				plan: user.plan,
				credits: user.credits,
				purchased_credits: user.purchasedCredits,
			}
		}
	}

	if (
		limit.credits + limit.purchased_credits <
		calculateCost({ provider, tool: mode })
	) {
		return { error: 'You are out of credits' }
	}

	return { limit, token, cookie }
}

export const updateUserRatelimit = async ({
	user: loggedInUser,
	provider,
	mode,
}: {
	user: User
	provider: Provider
	mode: Tool
}) => {
	const cost = costTable[provider.model] + costTable[mode]
	let credits = loggedInUser.credits
	credits -= cost
	let purchased_credits = loggedInUser.purchasedCredits
	if (credits < 0) {
		purchased_credits -= Math.abs(credits)
		credits = 0
		if (purchased_credits < 0) {
			purchased_credits = 0
		}
	}

	const [updatedUser] = await db
		.update(user)
		.set({
			credits: credits,
			purchasedCredits: purchased_credits,
		})
		.where(eq(user.id, loggedInUser.id))
		.returning()

	const currentUser = await db.query.user.findFirst({
		where: (user, { eq }) => eq(user.id, loggedInUser.id),
		with: {
			sessions: {
				where: (session, { gte }) =>
					gte(session.expiresAt, Date.now()),
			},
		},
	})

	if (!currentUser) return

	await Promise.all(
		currentUser.sessions.map(async (session) => {
			await redis.set<Limit>(
				session.id + '-limit',
				{
					plan: updatedUser.plan,
					credits: currentUser.credits,
					purchased_credits: currentUser.purchasedCredits,
				},
				{ ex: 60 * 60 * 24 },
			)
		}),
	)
}

export const syncUserRatelimitWithDB = async (userId: string) => {
	const currentUser = await db.query.user.findFirst({
		where: (user, { eq }) => eq(user.id, userId),
		with: {
			sessions: {
				where: (session, { gte }) =>
					gte(session.expiresAt, Date.now()),
			},
		},
	})

	if (!currentUser) return

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
