import { z } from 'zod'
import { groq, mistral } from '$api/ai/model'
import {
	extractReasoningMiddleware,
	type LanguageModelV1,
	wrapLanguageModel,
} from 'ai'
import {
	createGoogleGenerativeAI,
	type GoogleGenerativeAIProvider,
	type GoogleGenerativeAIProviderOptions,
} from '@ai-sdk/google'
import { env } from '$env/dynamic/private'
import { createOpenAI, type OpenAIProvider } from '@ai-sdk/openai'
import {
	createAnthropic,
	type AnthropicProvider,
} from '@ai-sdk/anthropic'
import { createXai, type XaiProvider } from '@ai-sdk/xai'

export const modelSchema = z
	.union([
		z.object({
			name: z.literal('openai'),
			model: z
				.enum([
					'gpt-4o',
					'gpt-4o-mini',
					'gpt-4.1',
					'gpt-4.1-mini',
					'gpt-4.1-nano',
					'o3-mini',
					'o4-mini',
				])
				.or(z.string()),
			reasoning_effort: z
				.enum(['low', 'medium', 'high'])
				.default('low')
				.optional(),
			api_key: z.string().optional().nullable(),
		}),
		z.object({
			name: z.literal('google'),
			model: z
				.enum([
					'gemini-2.0-flash-001',
					'gemini-2.5-pro-exp-03-25',
					'gemini-2.5-flash-preview-04-17',
				])
				.or(z.string()),
			thinking_budget: z.number().min(0).default(0).optional(),
			api_key: z.string().optional().nullable(),
		}),
		z.object({
			name: z.literal('groq'),
			model: z
				.enum([
					'deepseek-r1-distill-llama-70b',
					'llama-3.3-70b-versatile',
					'qwen-qwq-32b',
					// 'meta-llama/llama-4-scout-17b-16e-instruct',
					// 'meta-llama/llama-4-maverick-17b-128e-instruct',
				])
				.or(z.string()),
			api_key: z.string().optional().nullable(),
		}),
		z.object({
			name: z.literal('anthropic'),
			model: z
				.enum([
					'claude-3-5-sonnet-latest',
					'claude-3-7-sonnet-20250219',
					'claude-4-sonnet-20250514',
				])
				.or(z.string()),
			api_key: z.string().optional().nullable(),
		}),
		z.object({
			name: z.literal('xai'),
			model: z
				.enum([
					'grok-2-1212',
					'grok-2-vision-1212',
					'grok-3-beta',
					'grok-3-mini-beta',
				])
				.or(z.string()),
			api_key: z.string().optional().nullable(),
		}),
		z.object({
			name: z.literal('mistral'),
			model: z.enum(['mistral-small-latest']).or(z.string()),
			api_key: z.string().optional().nullable(),
		}),
		z.object({
			name: z.literal('open_router'),
			model: z
				.enum([
					'meta-llama/llama-4-scout:free',
					'meta-llama/llama-4-maverick:free',
				])
				.or(z.string()),
			api_key: z.string().optional().nullable(),
		}),
	])
	.default({ name: 'google', model: 'gemini-2.0-flash-001' })

const getContextSize = (provider: Provider) => {
	if (provider.model === 'gemini-2.0-flash-001') return 1_000_000
	if (
		provider.model === 'o3-mini' ||
		provider.model === 'claude-3-5-sonnet-latest' ||
		provider.model === 'claude-3-7-sonnet-20250219'
	)
		return 300_000
	return 128_000
}

export type Provider = z.infer<typeof modelSchema>

export const getModel = ({
	provider,
	searchGrounding,
}: {
	provider: Provider
	searchGrounding: boolean
}):
	| {
			model: LanguageModelV1
			providerOptions: Record<any, any> | undefined
			contextSize: number
			error: null
	  }
	| { model: null; providerOptions: null; error: string } => {
	let model
	let providerOptions = {}

	if (provider.name === 'google') {
		let google: GoogleGenerativeAIProvider
		if (env.GEMINI_API_KEY) {
			google = createGoogleGenerativeAI({
				apiKey: env.GEMINI_API_KEY,
			})
		} else if (provider.api_key) {
			google = createGoogleGenerativeAI({
				apiKey: provider.api_key,
			})
		} else {
			return {
				error: 'API Key not provided',
				model: null,
				providerOptions: null,
			}
		}

		model = google(provider.model, {
			useSearchGrounding: searchGrounding,
		})

		if (provider.model === 'gemini-2.5-flash-preview-04-17') {
			providerOptions = {
				google: {
					thinkingConfig: {
						thinkingBudget: provider.thinking_budget,
					},
				} satisfies GoogleGenerativeAIProviderOptions,
			}
		}
	} else if (provider.name === 'openai') {
		let openai: OpenAIProvider
		if (env.OPENAI_API_KEY) {
			openai = createOpenAI({
				apiKey: env.OPENAI_API_KEY,
			})
		} else if (provider.api_key) {
			openai = createOpenAI({
				apiKey: provider.api_key,
			})
		} else {
			return {
				error: 'API Key not provided',
				model: null,
				providerOptions: null,
			}
		}

		if (
			provider.model === 'o3-mini' ||
			provider.model === 'o4-mini'
		) {
			model = openai.responses(provider.model)
			providerOptions = {
				openai: {
					reasoningEffort: provider.reasoning_effort,
					reasoningSummary: 'detailed',
				},
			}
		} else {
			model = openai(provider.model)
		}
	} else if (provider.name === 'groq') {
		if (provider.model !== 'llama-3.3-70b-versatile') {
			model = wrapLanguageModel({
				model: groq(provider.model),
				middleware: extractReasoningMiddleware({
					tagName: 'think',
				}),
			})
		} else {
			model = groq(provider.model)
		}
	} else if (provider.name === 'anthropic') {
		let anthropic: AnthropicProvider
		if (env.CLAUDE_API_KEY) {
			anthropic = createAnthropic({
				apiKey: env.CLAUDE_API_KEY,
			})
		} else if (provider.api_key) {
			anthropic = createAnthropic({
				apiKey: provider.api_key,
			})
		} else {
			return {
				error: 'API Key not provided',
				model: null,
				providerOptions: null,
			}
		}

		model = anthropic(provider.model)
		if (
			provider.model === 'claude-3-7-sonnet-20250219' ||
			provider.model === 'claude-4-sonnet-20250514'
		) {
			providerOptions = {
				anthropic: {
					thinking: { type: 'enabled', budgetTokens: 12000 },
				},
			}
		}
	} else if (provider.name === 'xai') {
		let xai: XaiProvider
		if (env.XAI_API_KEY) {
			xai = createXai({
				apiKey: env.XAI_API_KEY,
			})
		} else if (provider.api_key) {
			xai = createXai({
				apiKey: provider.api_key,
			})
		} else {
			return {
				error: 'API Key not provided',
				model: null,
				providerOptions: null,
			}
		}
		model = xai(provider.model)
	} else if (provider.name === 'mistral') {
		model = mistral(provider.model)
	} else if (provider.name === 'open_router') {
		let openRouter: OpenAIProvider
		if (env.OPENROUTER_API_KEY) {
			openRouter = createOpenAI({
				baseURL: 'https://openrouter.ai/api/v1',
				apiKey: env.OPENROUTER_API_KEY,
				headers: {
					'HTTP-Referer': 'https://kon.chat', // Optional. Site URL for rankings on openrouter.ai.
					'X-Title': 'kon.chat', // Optional. Site title for rankings on openrouter.ai.
				},
			})
		} else if (provider.api_key) {
			openRouter = createOpenAI({
				baseURL: 'https://openrouter.ai/api/v1',
				apiKey: provider.api_key,
				headers: {
					'HTTP-Referer': 'https://kon.chat', // Optional. Site URL for rankings on openrouter.ai.
					'X-Title': 'kon.chat', // Optional. Site title for rankings on openrouter.ai.
				},
			})
		} else {
			return {
				error: 'API Key not provided',
				model: null,
				providerOptions: null,
			}
		}
		model = openRouter(provider.model)
	} else {
		return {
			error: 'Invalid Model',
			model: null,
			providerOptions: null,
		}
	}

	return {
		model,
		providerOptions,
		error: null,
		contextSize: getContextSize(provider),
	}
}
