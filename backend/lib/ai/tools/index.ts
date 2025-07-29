import { type DataStreamWriter, tool } from 'ai'
import { web_reader } from './web-reader'
import { academic_search } from './academic-search'
import { image_generation } from './google-imagen'
import { x_search } from './x-search'
import { web_search } from './web-search'
import { openai_imagen } from './openai-imagen'
import { currency_converter } from './currency-converter'
import { stock_chart } from './stock-chart'
import type { Setting, User } from '$api/db/type'

export const toolList = [
	'chat',
	'x_search',
	'web_search',
	'academic_search',
	'web_reader_exa',
	'gpt-image-1',
] as const

export type Tool = (typeof toolList)[number]

export const tools = (
	user: User,
	chatId: string,
	writeMessageAnnotation: (value: any) => Promise<void>,
	mode: Tool,
	settings?: Setting,
) => {
	const exaAPIKey = Bun.env.EXA_API_KEY || settings?.exaApiKey
	const openAIAPIKey =
		Bun.env.OPENAI_API_KEY || settings?.openAIApiKey
	const googleAPIKey =
		Bun.env.GEMINI_API_KEY || settings?.geminiApiKey

	const searchEnable = !!exaAPIKey
	const openaiEnable = !!openAIAPIKey
	const geminiEnable = !!googleAPIKey

	const toolMap = {
		chat: geminiEnable
			? {
					image_generation: image_generation({
						chatId,
						user,
						apiKey: googleAPIKey,
					}),
					// image_captioning: toolList.image_captioning,
					currency_converter: currency_converter(),
					stock_chart: stock_chart(),
				}
			: {
					currency_converter: currency_converter(),
					stock_chart: stock_chart(),
				},
		x_search: {
			// x_search: x_search()
		},
		web_search: searchEnable
			? {
					web_search: web_search({
						writeMessageAnnotation,
						apiKey: exaAPIKey,
					}),
				}
			: {},
		academic_search: searchEnable
			? { academic_search: academic_search({ apiKey: exaAPIKey }) }
			: {},
		web_reader_exa: searchEnable
			? { web_reader_exa: web_reader({ apiKey: exaAPIKey }) }
			: {},
		'gpt-image-1': openaiEnable
			? {
					'gpt-image-1': openai_imagen({
						chatId,
						user,
						apiKey: openAIAPIKey,
					}),
				}
			: {},
	} as const

	return toolMap[mode]
}

export const activeTools = (mode: Tool) => {
	const toolMap: Record<Tool, string[]> = {
		x_search: ['x_search'],
		chat: ['image_generation'],
		web_search: ['web_search'],
		web_reader_exa: ['web_reader_exa'],
		academic_search: ['academic_search'],
		'gpt-image-1': ['gpt-image-1'],
	}
	return toolMap[mode]
}
