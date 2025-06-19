import { tavily as Tavily } from '@tavily/core'
import { TAVILY_API_KEY } from '$env/static/private'

export const tavily = Tavily({ apiKey: TAVILY_API_KEY })
