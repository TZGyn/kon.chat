import { tavily as Tavily } from '@tavily/core'
export const tavily = Tavily({ apiKey: Bun.env.TAVILY_API_KEY })
