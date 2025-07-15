import { createOpenAI } from '@ai-sdk/openai'

export const openai = createOpenAI({
	apiKey: Bun.env.OPENAI_API_KEY,
	compatibility: 'strict',
})
