import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import { createXai } from '@ai-sdk/xai'
import { createMistral } from '@ai-sdk/mistral'
import { env } from '$env/dynamic/private'

const {
	OPENAI_API_KEY,
	CLAUDE_API_KEY,
	GEMINI_API_KEY,
	GROQ_API_KEY,
	XAI_API_KEY,
	MISTRAL_API_KEY,
	OPENROUTER_API_KEY,
} = env

export const openai = createOpenAI({
	apiKey: OPENAI_API_KEY,
	compatibility: 'strict',
})

export const anthropic = createAnthropic({
	apiKey: CLAUDE_API_KEY,
})

export const google = createGoogleGenerativeAI({
	apiKey: GEMINI_API_KEY,
})

export const groq = createGroq({
	apiKey: GROQ_API_KEY,
})

export const xai = createXai({
	apiKey: XAI_API_KEY,
})

export const mistral = createMistral({
	apiKey: MISTRAL_API_KEY,
})

export const openRouter = createOpenAI({
	baseURL: 'https://openrouter.ai/api/v1',
	apiKey: OPENROUTER_API_KEY,
	headers: {
		'HTTP-Referer': 'https://kon.chat', // Optional. Site URL for rankings on openrouter.ai.
		'X-Title': 'kon.chat', // Optional. Site title for rankings on openrouter.ai.
	},
})
