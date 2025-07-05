import { z } from 'zod'
import {
	anthropic,
	google,
	groq,
	mistral,
	openai,
	openRouter,
	xai,
} from '$api/ai/model'
import {
	extractReasoningMiddleware,
	type LanguageModelV1,
	wrapLanguageModel,
} from 'ai'
import { type GoogleGenerativeAIProviderOptions } from '@ai-sdk/google'

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
		}),
		z.object({
			name: z.literal('mistral'),
			model: z.enum(['mistral-small-latest']).or(z.string()),
		}),
		z.object({
			name: z.literal('open_router'),
			model: z
				.enum([
					'meta-llama/llama-4-scout:free',
					'meta-llama/llama-4-maverick:free',
				])
				.or(z.string()),
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

export const freeModels = [
	'gemini-2.0-flash-001',
	'gemini-2.5-pro-exp-03-25',
	'meta-llama/llama-4-scout:free',
	'meta-llama/llama-4-maverick:free',
] as const

export const standardModels = [
	'gpt-4o',
	'gpt-4o-mini',
	'gpt-4.1',
	'gpt-4.1-mini',
	'gpt-4.1-nano',
	'o3-mini',
	'o4-mini',
	'gemini-2.5-flash-preview-04-17',
	'deepseek-r1-distill-llama-70b',
	'llama-3.3-70b-versatile',
	'grok-2-1212',
	'grok-2-vision-1212',
	'grok-3-beta',
	'grok-3-mini-beta',
	'qwen-qwq-32b',
	'mistral-small-latest',
] as const

export const premiumModels = [
	'claude-3-5-sonnet-latest',
	'claude-3-7-sonnet-20250219',
	'claude-4-sonnet-20250514',
] as const

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
		model = xai(provider.model)
	} else if (provider.name === 'mistral') {
		model = mistral(provider.model)
	} else if (provider.name === 'open_router') {
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
