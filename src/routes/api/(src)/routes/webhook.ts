import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { Webhooks } from '@polar-sh/hono'
import { db } from '$api/db'
import { user } from '$api/db/schema'
import { eq } from 'drizzle-orm'
import { syncUserRatelimitWithDB } from '$api/ratelimit'

const app = new Hono()

app.use('*', cors({ origin: '*' }))

app.post(
	'/polar',
	Webhooks({
		webhookSecret: Bun.env.POLAR_WEBHOOK_SECRET!,
		onSubscriptionRevoked: async (payload) => {
			if (
				payload.data.priceId === Bun.env.POLAR_PRO_PLAN_PRICE_ID ||
				payload.data.priceId === Bun.env.POLAR_BASIC_PLAN_PRICE_ID
			) {
				const customerId = payload.data.customerId

				if (!customerId) return

				await db
					.update(user)
					.set({
						plan: 'free',
						credits: 0,
					})
					.where(eq(user.polarCustomerId, customerId))

				const customer_user = await db.query.user.findFirst({
					where: (user, { eq }) =>
						eq(user.polarCustomerId, customerId),
				})

				if (!customer_user) return

				await syncUserRatelimitWithDB(customer_user.id)
			}
		},
		onOrderCreated: async (payload) => {
			if (
				payload.data.billingReason === 'subscription_cycle' ||
				payload.data.billingReason === 'subscription_create'
			) {
				const priceId = payload.data.productPriceId
				if (
					priceId === Bun.env.POLAR_PRO_PLAN_PRICE_ID ||
					priceId === Bun.env.POLAR_BASIC_PLAN_PRICE_ID
				) {
					const customerId = payload.data.customerId

					if (!customerId) return

					const customer_user = await db.query.user.findFirst({
						where: (user, { eq }) =>
							eq(user.polarCustomerId, customerId),
					})

					if (!customer_user) return

					await db
						.update(user)
						.set({
							plan:
								priceId === Bun.env.POLAR_PRO_PLAN_PRICE_ID
									? 'pro'
									: 'basic',
							credits:
								priceId === Bun.env.POLAR_PRO_PLAN_PRICE_ID
									? 150000
									: 50000,
						})
						.where(eq(user.polarCustomerId, customerId))

					await syncUserRatelimitWithDB(customer_user.id)
				}
			} else if (payload.data.billingReason === 'purchase') {
				const priceId = payload.data.productPriceId
				if (priceId === Bun.env.POLAR_500_CREDITS_PRICE_ID) {
					const customerId = payload.data.customerId
					if (!customerId) return
					const customer_user = await db.query.user.findFirst({
						where: (user, { eq }) =>
							eq(user.polarCustomerId, customerId),
					})
					if (!customer_user) return
					await db
						.update(user)
						.set({
							purchasedCredits:
								customer_user.purchasedCredits + 50000,
						})
						.where(eq(user.polarCustomerId, customerId))
				}
			}
		},
	}),
)

export { app as WebhookRoutes }
