import { zValidator } from '@hono/zod-validator'
import { createDataStream, smoothStream, streamText, tool } from 'ai'
import { Hono } from 'hono'
import { stream } from 'hono/streaming'
import { z } from 'zod'
import * as mathjs from 'mathjs'
import { getModel, modelSchema } from '$api/model'
import { processMessages } from '$api/message'

const app = new Hono()

app.post(
	'/',
	zValidator(
		'json',
		z.object({
			messages: z.any(),
			provider: modelSchema,
			spreadSheetData: z.any().array().array(),
			selectedSheetData: z
				.object({
					topLeftRow: z.number(),
					topLeftColumn: z.number(),
					bottomRightRow: z.number(),
					bottomRightColumn: z.number(),
					data: z.any().array(),
				})
				.array(),
			searchGrounding: z.boolean().default(false),
		}),
	),
	async (c) => {
		const {
			messages,
			provider,
			searchGrounding,
			spreadSheetData,
			selectedSheetData,
		} = c.req.valid('json')

		const {
			coreMessages,
			error: processMessageError,
			userMessage,
			userMessageDate,
		} = processMessages({ provider, messages })

		if (processMessageError !== undefined) {
			return c.text(processMessageError, { status: 400 })
		}

		const { model, error, providerOptions } = getModel({
			provider,
			searchGrounding,
		})

		if (error !== null) {
			return c.text(error, 400)
		}

		return stream(c, (stream) =>
			stream.pipe(
				createDataStream({
					execute: async (dataStream) => {
						dataStream.writeMessageAnnotation({
							type: 'model',
							model: provider.model,
						})

						dataStream.writeData({
							type: 'message',
							message: 'Understanding prompt',
						})

						dataStream.writeData({
							type: 'message',
							message: 'Generating Response',
						})

						const result = streamText({
							model: model,
							messages: coreMessages,
							system: `
								You are a excel assistant
								${
									!searchGrounding &&
									`
										Dont call any tools as there are no tools
										Only use the information provided to you
										If theres is a need for search, the search result will be provided to you
									`
								}

								DO NOT ASK USER FOR CONFIRMATION UNLESS YOU ARE TOLD TO DO SO
								Example:
								If a user ask u to generate random data without specifying the format like email, dont ask them which format do they want
								Try your best to predict the answer based on the data given to you

								Try to complete all the tasks in one go before returning

								if a math equation is generated, wrap it around $$ for katex inline styling and $$ for block
								example:

								(inline) 
								Pythagorean theorem: $$a^2+b^2=c^2$$

								(block)
								$$
								\mathcal{L}\{f\}(s) = \int_0^{\infty} {f(t)e^{-st}dt}
								$$

								You will be provided the current spreadsheet data in JSON array format
								it will be an array of arrays

								You may use index for locating cells and rows (index starts with 0)

								User may ask for specific cells using row number and column alphabet
								Row number will be display as 1-indexed but it is 0-indexed under the hood
								Assume user is using 1-indexed and minus 1 with getting the data unless the user specify not to minus
								As for column alphabet, a tool will be provided to you to convert the alphabet to column number (in 0 indexed as well)
								Another tool will be provided to you to convert column number (0-indexed) back to the alphabet for better user experience

								A tool will also be given to you to get the cell value given the row and column number in 0-indexed
								If you need for are asked for a cell value, you must use it instead of guessing it yourself

								2 tools will also be given to you to set the cell value 
								One will be used for setting individual cell value, given a row and column number in 0-indexed and the data
								Another will be used for setting a range cell values, given an array row and column number in 0-indexed and the data
								The values set using the tools will be highlighted
								So if a range of cell values is updated, but you used individual cell update instead of range update
								The highlight will not be in range, (worse for user experience)
								So try to use as many range update as possible

								Dont worry about row/column number exceeding array size
								For example, if the user ask to generate 10 rows of data, but the spreadsheet data given to you only has 2 rows,
								You can ask to set cell value at row 3,4,5 and so on.
								Array size validation will not be handle here

								Here are the available tools 
								- convertColumnFromAlphabetToNumber
								- convertColumnFromNumberToAlphabet
								- getCellValue
								- getRangeValues
								- setSheetCell
								- setSheetCellRange
								- unsetSheetRange
								- deleteRows
								- deleteColumns
								- calculate

								Provide the result at the end

								Here is the spreadsheet data:
								${JSON.stringify(spreadSheetData)}

								You will be given user selected sheet data
								The data will be in an array of object since the user can select multiple ranges
								Each range will have a top left row (0-indexed) column (1-indexed) and bottom right row (0-indexed) column (1-indexed)
								And each range will have the selected data

								Since the data is not human friendly, when asked to output you must make it human readable (preferably in table form)
								Here is the user selected sheet data:
								${JSON.stringify(selectedSheetData)}
							`,
							providerOptions,
							tools: {
								convertColumnFromAlphabetToNumber: tool({
									description:
										'Convert Alphabet column like (AA) to column number (0-indexed)',
									parameters: z.object({
										column: z
											.string()
											.describe('Column alphabet like (AB)'),
									}),
									execute: async ({ column }) => {
										const letters = column.toUpperCase()
										for (var p = 0, n = 0; p < letters.length; p++) {
											n = letters[p].charCodeAt(0) - 64 + n * 26
										}
										return n - 1
									},
								}),
								convertColumnFromNumberToAlphabet: tool({
									description:
										'Convert number column (0-indexed) back to alphabet (AA)',
									parameters: z.object({
										column: z
											.number()
											.describe('Column number (start from 0)'),
									}),
									execute: async ({ column }) => {
										let num = column
										let letters = ''
										while (num >= 0) {
											letters =
												'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[num % 26] +
												letters
											num = Math.floor(num / 26) - 1
										}
										return letters
									},
								}),
								getCellValue: tool({
									description:
										'Get value of cell given a row and column number',
									parameters: z.object({
										row: z
											.number()
											.describe('Row number (0-indexed)'),
										column: z
											.number()
											.describe('Column number (0-indexed)'),
									}),
									execute: async ({ row, column }) => {
										if (spreadSheetData.length < row) {
											return ''
										}
										const rowData = spreadSheetData[row]
										if (!rowData) return ''
										return spreadSheetData[row][column] ?? ''
									},
								}),
								getRangeValues: tool({
									description:
										'Get all values given a start and end position',
									parameters: z.object({
										rowStart: z
											.number()
											.describe('Row start number (0-indexed)'),
										columnStart: z
											.number()
											.describe('Column start number (0-indexed)'),
										rowEnd: z
											.number()
											.describe('Row end number (0-indexed)'),
										columnEnd: z
											.number()
											.describe('Column end number (0-indexed)'),
									}),
									execute: async ({
										columnEnd,
										columnStart,
										rowEnd,
										rowStart,
									}) => {
										let rangeData = []
										let row = rowStart
										while (row <= rowEnd) {
											let data = []
											let col = columnStart
											while (col <= columnEnd) {
												let element = ''
												if (
													spreadSheetData.length >= row &&
													spreadSheetData[row]
												) {
													element = spreadSheetData[row][col] || ''
												}
												data.push(element)
												col++
											}
											rangeData.push(data)
											row++
										}
										return rangeData
									},
								}),
								setSheetCell: tool({
									description:
										'Set sheet cell data given row, column and the data to set',
									parameters: z.object({
										row: z
											.number()
											.describe('Row number (0-indexed)'),
										column: z
											.number()
											.describe('Column number (0-indexed)'),
										data: z
											.string()
											.describe('Data to set in the cell'),
									}),
									execute: async (data) => {
										return data
									},
								}),
								setSheetCellRange: tool({
									description:
										'Set sheet cells given an array of row, column and the data to set',
									parameters: z.object({
										data: z.array(
											z.object({
												row: z
													.number()
													.describe('Row number (0-indexed)'),
												column: z
													.number()
													.describe('Column number (0-indexed)'),
												data: z
													.string()
													.describe('Data to set in the cell'),
											}),
										),
									}),
									execute: async ({ data }) => {
										return data
									},
								}),
								unsetSheetRange: tool({
									description:
										'Unset sheet cell value given an array of row and column',
									parameters: z.object({
										data: z.array(
											z.object({
												row: z
													.number()
													.describe('Row number (0-indexed)'),
												column: z
													.number()
													.describe('Column number (0-indexed)'),
											}),
										),
									}),
									execute: async ({ data }) => {
										return data
									},
								}),
								deleteRows: tool({
									description:
										'Delete sheet rows given an array of row number',
									parameters: z.object({
										data: z.array(
											z.number().describe('Row number (0-indexed)'),
										),
									}),
									execute: async ({ data }) => {
										return data
									},
								}),
								deleteColumns: tool({
									description:
										'Delete sheet columns given an array of row number',
									parameters: z.object({
										data: z.array(
											z
												.number()
												.describe('Column number (0-indexed)'),
										),
									}),
									execute: async ({ data }) => {
										return data
									},
								}),
								calculate: tool({
									description:
										'A tool for evaluating mathematical expressions. ' +
										'Example expressions: ' +
										"'1.2 * (2 + 4.5)', '12.7 cm to inch', 'sin(45 deg) ^ 2'.",
									parameters: z.object({ expression: z.string() }),
									execute: async ({ expression }) =>
										mathjs.evaluate(expression),
								}),
							},
							maxSteps: 10,
							onChunk: ({ chunk }) => {},
							onStepFinish: (data) => {},
							onError: (error) => {
								console.log(error)
							},
							experimental_transform: smoothStream({
								delayInMs: 20, // optional: defaults to 10ms
								chunking: 'word', // optional: defaults to 'word'
							}),
							onFinish: async ({
								response,
								usage,
								reasoning,
								providerMetadata,
							}) => {},
						})

						result.mergeIntoDataStream(dataStream, {
							sendReasoning: true,
						})
					},
					onError: (error) => {
						// Error messages are masked by default for security reasons.
						// If you want to expose the error message to the client, you can do so here:
						console.log(error)
						return error instanceof Error
							? error.message
							: String(error)
					},
				}),
			),
		)
	},
)

export { app as SheetRoutes }
