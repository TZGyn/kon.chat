import { type DataStreamWriter, tool } from 'ai'
import { web_reader } from './web-reader'
import { academic_search } from './academic-search'
import { image_generation } from './google-imagen'
import { x_search } from './x-search'
import { web_search } from './web-search'
import { openai_imagen } from './openai-imagen'
import type { Setting, User } from '$api/db/type'
import { env } from '$env/dynamic/private'

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
	dataStream: DataStreamWriter,
	mode: Tool,
	settings?: Setting,
) => {
	const exaAPIKey = env.EXA_API_KEY || settings?.exaApiKey
	const openAIAPIKey = env.OPENAI_API_KEY || settings?.openAIApiKey

	const searchEnable = !!exaAPIKey

	const openaiEnable = !!openAIAPIKey

	const toolMap = {
		chat: {
			image_generation: image_generation({ chatId, user }),
			// image_captioning: toolList.image_captioning,
		},
		x_search: {
			// x_search: x_search()
		},
		web_search: searchEnable
			? { web_search: web_search({ dataStream, apiKey: exaAPIKey }) }
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
