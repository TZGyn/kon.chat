import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import { createXai } from '@ai-sdk/xai'
import { createMistral } from '@ai-sdk/mistral'

export const openai = createOpenAI({
	apiKey: Bun.env.OPENAI_API_KEY,
	compatibility: 'strict',
})

export const anthropic = createAnthropic({
	apiKey: Bun.env.CLAUDE_API_KEY,
})

export const google = createGoogleGenerativeAI({
	apiKey: Bun.env.GEMINI_API_KEY,
})

export const groq = createGroq({
	apiKey: Bun.env.GROQ_API_KEY,
})

export const xai = createXai({
	apiKey: Bun.env.XAI_API_KEY,
})

export const mistral = createMistral({
	apiKey: Bun.env.MISTRAL_API_KEY,
})

export const openRouter = createOpenAI({
	baseURL: 'https://openrouter.ai/api/v1',
	apiKey: Bun.env.OPENROUTER_API_KEY,
	headers: {
		'HTTP-Referer': 'https://kon.chat', // Optional. Site URL for rankings on openrouter.ai.
		'X-Title': 'kon.chat', // Optional. Site title for rankings on openrouter.ai.
	},
})
