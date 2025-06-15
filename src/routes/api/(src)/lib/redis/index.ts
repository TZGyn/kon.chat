import { Redis } from '@upstash/redis'

export const redis = new Redis({
	url: Bun.env.UPSTASH_ENDPOINT,
	token: Bun.env.UPSTASH_SECRET,
})
