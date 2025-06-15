import { Tool } from '$api/ai/tools'
import {
	freeModels,
	premiumModels,
	Provider,
	standardModels,
} from '$api/model'

// 100 credits = 1 cent
export const costTable: {
	[Key in
		| (typeof freeModels)[number]
		| (typeof standardModels)[number]
		| (typeof premiumModels)[number]
		| Tool]: number
} = {
	'gemini-2.0-flash-001': 0,
	'gemini-2.5-pro-exp-03-25': 0,
	'meta-llama/llama-4-scout:free': 0,
	'meta-llama/llama-4-maverick:free': 0,
	'claude-3-5-sonnet-latest': 500,
	'claude-3-7-sonnet-20250219': 500,
	'deepseek-r1-distill-llama-70b': 50,
	'gpt-4o': 100,
	'gpt-4.1': 80,
	'gpt-4.1-mini': 40,
	'gpt-4.1-nano': 20,
	'gpt-4o-mini': 30,
	'o4-mini': 50,
	'o3-mini': 50,
	'gemini-2.5-flash-preview-04-17': 20,
	'grok-2-1212': 40,
	'grok-2-vision-1212': 40,
	'grok-3-beta': 200,
	'grok-3-mini-beta': 30,
	'llama-3.3-70b-versatile': 30,
	'qwen-qwq-32b': 30,
	'mistral-small-latest': 30,
	academic_search: 200,
	chat: 0,
	web_reader: 200,
	web_search: 200,
	x_search: 200,
	'gpt-image-1': 1200,
	// image: 5,
} as const

export const calculateCost = ({
	provider,
	tool,
}: {
	provider: Provider
	tool: Tool
}) => {
	return costTable[provider.model] + costTable[tool]
}
