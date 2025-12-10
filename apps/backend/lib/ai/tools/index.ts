import { type DataStreamWriter, tool, type ToolSet } from 'ai'
import { web_reader } from './web-reader'
import { academic_search } from './academic-search'
import { image_generation } from './google-imagen'
import { x_search } from './x-search'
import { web_search } from './web-search'
import { openai_imagen } from './openai-imagen'
import { currency_converter } from './currency-converter'
import { stock_chart } from './stock-chart'
import type { Setting, User } from '$api/db/type'

export const tools = (
	user: User,
	chatId: string,
	writeMessageAnnotation: (value: any) => Promise<void>,
	settings?: Setting,
): ToolSet => {
	const exaAPIKey = Bun.env.EXA_API_KEY || settings?.exaApiKey
	const openAIAPIKey =
		Bun.env.OPENAI_API_KEY || settings?.openAIApiKey
	const googleAPIKey =
		Bun.env.GEMINI_API_KEY || settings?.geminiApiKey

	const searchEnable = !!exaAPIKey
	const openaiEnable = !!openAIAPIKey
	const geminiEnable = !!googleAPIKey

	let tools: ToolSet = {
		currency_converter: currency_converter(),
		stock_chart: stock_chart(),
	}

	if (searchEnable) {
		tools = {
			...tools,
			web_search: web_search({
				writeMessageAnnotation,
				apiKey: exaAPIKey,
			}),
			academic_search: academic_search({ apiKey: exaAPIKey }),
			web_reader_exa: web_reader({ apiKey: exaAPIKey }),
		}
	}

	if (openaiEnable) {
		tools = {
			...tools,
			'gpt-image-1': openai_imagen({
				chatId,
				user,
				apiKey: openAIAPIKey,
			}),
		}
	}

	if (geminiEnable) {
		tools = {
			...tools,
			image_generation: image_generation({
				chatId,
				user,
				apiKey: googleAPIKey,
			}),
		}
	}

	return tools
}
