import { Redis } from 'ioredis'

export const redis = new Redis(Bun.env.REDIS_URL)

export const createRedis = () => {
	return new Redis(Bun.env.REDIS_URL)
}
