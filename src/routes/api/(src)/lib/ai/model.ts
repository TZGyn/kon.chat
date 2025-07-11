import { createOpenAI } from '@ai-sdk/openai'
import { OPENAI_API_KEY } from '$env/static/private'

export const openai = createOpenAI({
	apiKey: OPENAI_API_KEY,
	compatibility: 'strict',
})
