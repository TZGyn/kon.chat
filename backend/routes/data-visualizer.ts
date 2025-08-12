import { Hono } from 'hono'
import {
	convertToCoreMessages,
	createDataStreamResponse,
	generateObject,
	NoSuchToolError,
	streamText,
	type TextPart,
} from 'ai'
import { z } from 'zod'
import type { AuthType } from '$api/auth'
import { createOpenAI } from '@ai-sdk/openai'
import { stream } from 'hono/streaming'
import { zValidator } from '@hono/zod-validator'
import * as XLSX from 'xlsx'
import { dataVisualizerSchema } from '$api/ai/tools/data-visuallizer'

const app = new Hono<{
	Variables: AuthType
}>().post(
	'/',
	zValidator(
		'json',
		z.object({
			messages: z.any(),
		}),
	),
	async (c) => {
		const { messages } = c.req.valid('json')
		const setting = c.get('setting')

		const openai = createOpenAI({
			apiKey: setting.openAIApiKey!,
		})

		const coreMessages = convertToCoreMessages(messages)

		const processedMessages = coreMessages.map((message) => {
			if (message.role !== 'user') return message
			if (typeof message.content === 'string') return message

			return {
				...message,
				content: message.content.flatMap((content) => {
					if (content.type !== 'file') return content

					if (
						[
							'application/vnd.ms-excel',
							'text/csv',
							'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
						].includes(content.mimeType)
					) {
						const wb = XLSX.read(content.data, { type: 'base64' })

						return [
							...wb.SheetNames.map((name) => {
								return {
									type: 'text',
									text: XLSX.utils.sheet_to_csv(wb.Sheets[name]),
								} as TextPart
							}),
						]
					}
					return content
				}),
			}
		})

		const result = streamText({
			model: openai('gpt-5-nano'),
			temperature: 1,
			tools: {
				dataVisualizerGenerateCharts: {
					description: 'Generate charts on the frontend',
					parameters: z.object({
						chartData: dataVisualizerSchema,
					}),
					execute: async (data) => {
						return data
					},
				},
			},
			system: `
				You are a chart generator, you have been given a tool to generate chart on the frontend
				You must use this tool atleast once
				The tool have no return data

				Based on the user request, generate the data needed for the charts
				Make sure to engage with the user rather than just calling the tool

				Data for each type of graph:
				Graphs such as line and area, the x value must be date format, for example 2024-01-21

				The rest can be whatever you like

				Always prioritize to generate all the charts in one tool call, this will have a better user experience
			`,
			messages: processedMessages,
			toolCallStreaming: true,
			maxRetries: 5,
			experimental_repairToolCall: async ({
				toolCall,
				tools,
				parameterSchema,
				error,
			}) => {
				if (NoSuchToolError.isInstance(error)) {
					return null // do not attempt to fix invalid tool names
				}

				console.log(
					'Fixing tool call================================',
				)
				console.log('toolCall', toolCall)
				console.log('tools', tools)
				console.log('parameterSchema', parameterSchema)
				console.log('error', error)

				const tool = tools[toolCall.toolName as keyof typeof tools]

				const { object: repairedArgs } = await generateObject({
					model: openai('gpt-5-nano'),
					schema: tool.parameters,
					temperature: 1,
					prompt: [
						`The model tried to call the tool "${toolCall.toolName}"` +
							` with the following arguments:`,
						JSON.stringify(toolCall.args),
						`The tool accepts the following schema:`,
						JSON.stringify(parameterSchema(toolCall)),
						'Please fix the arguments.',
					].join('\n'),
				})
				return { ...toolCall, args: JSON.stringify(repairedArgs) }
			},
			onError: (error) => {
				console.log(error)
			},
		})

		return createDataStreamResponse({
			execute: (dataStream) => {
				result.mergeIntoDataStream(dataStream)
			},
		})
	},
)

export { app as DataVisualizerRoutes }
