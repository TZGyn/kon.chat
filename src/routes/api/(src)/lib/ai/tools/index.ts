import { type DataStreamWriter, tool } from 'ai'
import { web_reader } from './web-reader'
import { academic_search } from './academic-search'
import { image_generation } from './google-imagen'
import { x_search } from './x-search'
import { web_search } from './web-search'
import { openai_imagen } from './openai-imagen'
import type { User } from '$api/db/type'

export const toolList = [
	'chat',
	'x_search',
	'web_search',
	'academic_search',
	'web_reader',
	'gpt-image-1',
] as const

export type Tool = (typeof toolList)[number]

export const tools = (
	user: User,
	chatId: string,
	dataStream: DataStreamWriter,
	mode: Tool,
) => {
	const toolMap = {
		chat: {
			image_generation: image_generation({ chatId, user }),
			// image_captioning: toolList.image_captioning,
		},
		x_search: { x_search: x_search() },
		web_search: { web_search: web_search({ dataStream }) },
		academic_search: { academic_search: academic_search() },
		web_reader: { web_reader: web_reader() },
		'gpt-image-1': {
			'gpt-image-1': openai_imagen({ chatId, user }),
		},
	} as const

	return toolMap[mode]
}

export const activeTools = (mode: Tool) => {
	const toolMap: Record<Tool, string[]> = {
		x_search: ['x_search'],
		chat: ['image_generation'],
		web_search: ['web_search'],
		web_reader: ['web_reader'],
		academic_search: ['academic_search'],
		'gpt-image-1': ['gpt-image-1'],
	}
	return toolMap[mode]
}
