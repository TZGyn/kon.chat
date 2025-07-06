import {
	addEmbeddings,
	findRelevantContent,
	generateEmbeddings,
} from '$api/ai/embeddings'
import { google } from '$api/ai/model'
import {
	deleteSessionTokenCookie,
	setSessionTokenCookie,
	validateSessionToken,
} from '$api/auth/session'
import { db } from '$api/db'
import { document, embeddings, upload } from '$api/db/schema'
import { processMessages } from '$api/message'
import { authMiddleware } from '$api/middleware/auth'
import { getModel, modelSchema } from '$api/model'
import { s3Client } from '$api/s3'
import { nanoid } from '$api/utils'
import { zValidator } from '@hono/zod-validator'
import {
	createDataStreamResponse,
	generateText,
	smoothStream,
	streamText,
	tool,
} from 'ai'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { serialize } from 'hono/utils/cookie'
import { PDFDocument } from 'pdf-lib'
import { z } from 'zod'

const app = new Hono()
	.get('/', async (c) => {
		const token = getCookie(c, 'session') ?? null

		if (token === null) {
			return c.json({ id: '' }, 401)
		}

		const { session, user } = await validateSessionToken(token)

		if (!user) {
			return c.json({ id: '' }, 401)
		}

		if (session !== null) {
			setSessionTokenCookie(c, token, session.expiresAt)
		} else {
			deleteSessionTokenCookie(c)
		}
		const documents = await db.query.document.findMany({
			where: (document, t) =>
				t.and(
					t.eq(document.userId, user.id),
					t.eq(document.type, 'pdf'),
				),
		})
		return c.json({ pdfs: documents })
	})

	.post(
		'/new',
		zValidator(
			'form',
			z.union([
				z.object({
					file: z
						.instanceof(File)
						.refine((file) => file.size <= 5 * 1024 * 1024, {
							message: 'File size should be less than 5MB',
						})
						// Update the file type based on the kind of files you want to accept
						.refine(
							(file) =>
								[
									'image/jpeg',
									'image/png',
									'application/pdf',
									// 'text/csv',
									// 'text/plain',
								].includes(file.type),
							{
								message: 'File type not supported',
							},
						),
				}),
				z.object({
					url: z.string().url(),
					name: z.string(),
				}),
			]),
		),
		async (c) => {
			const token = getCookie(c, 'session') ?? null

			if (token === null) {
				return c.json({ id: '' }, 401)
			}

			const { session, user } = await validateSessionToken(token)

			if (!user) {
				return c.json({ id: '' }, 401)
			}

			if (session !== null) {
				setSessionTokenCookie(c, token, session.expiresAt)
			} else {
				deleteSessionTokenCookie(c)
			}

			const formData = c.req.valid('form')

			let file

			if ('url' in formData) {
				const { url, name } = formData
				try {
					const response = await fetch(url)
					if (!response.ok) {
						return c.json({ id: '' }, 401)
					}

					if (
						response.headers.get('content-type') !== 'application/pdf'
					) {
						return c.json({ id: '' }, 401)
					}

					const pdfContent = await response.blob()
					file = new File([pdfContent], 'download.pdf', {
						type: pdfContent.type,
					})
				} catch (error) {
					return c.json({ id: '' }, 401)
				}
			} else {
				const { file: fileBlob } = formData
				file = fileBlob
			}

			const id = `${user.id}/documents/${nanoid()}-${file.name}`
			const s3file = s3Client.file(id)

			await s3file.write(file)

			const documentId = nanoid()

			const uploadId = nanoid() + '.pdf'
			await db.insert(upload).values({
				id: uploadId,
				userId: user.id,
				key: id,
				mimeType: file.type,
				name: file.name,
				size: file.size,
				createdAt: Date.now(),
			})

			await db.insert(document).values({
				id: documentId,
				userId: user.id,
				type: 'pdf',
				name: file.name,
				uploadId: uploadId,
				createdAt: Date.now(),
			})

			return c.json({ id: documentId }, 200)
		},
	)

	.get('/:pdf_id/markdown', async (c) => {
		let token = getCookie(c, 'session') ?? null
		if (!token || token.startsWith('free:')) {
			return c.text('You must be logged in to use this feature', {
				status: 400,
			})
		}

		const pdf_id = c.req.param('pdf_id')

		const pdfData = await db.query.document.findFirst({
			where: (document, { eq, and }) =>
				and(eq(document.id, pdf_id), eq(document.type, 'pdf')),
			with: {
				upload: true,
			},
		})

		if (!pdfData) {
			return c.text('Invalid ID', { status: 400 })
		}
		if (pdfData.markdown) {
			c.header('Content-Type', 'application/json')
			return c.json({ markdown: pdfData.markdown })
		}

		const s3file = s3Client.file(pdfData.upload.key)
		const pdfDoc = await PDFDocument.load(await s3file.arrayBuffer())
		const numberOfPages = pdfDoc.getPages().length
		let pages = []
		let index = 0
		const length = 3
		while (index < numberOfPages) {
			if (index + length >= numberOfPages) {
				break
			}
			const pagesIndex = Array.from(Array(length).keys()).map(
				(num) => num + index,
			)
			const subDocument = await PDFDocument.create()
			// copy the page at current index
			const copiedPages = await subDocument.copyPages(pdfDoc, [
				...pagesIndex,
			])
			for (const copiedPage of copiedPages) {
				subDocument.addPage(copiedPage)
			}
			pages.push(await subDocument.save())
			index += length
		}
		if (index < numberOfPages) {
			const rest = numberOfPages - index

			const pagesIndex = Array.from(Array(rest).keys()).map(
				(num) => num + index,
			)
			const subDocument = await PDFDocument.create()
			// copy the page at current index
			const copiedPages = await subDocument.copyPages(pdfDoc, [
				...pagesIndex,
			])
			for (const copiedPage of copiedPages) {
				subDocument.addPage(copiedPage)
			}
			pages.push(await subDocument.save())
		}

		return createDataStreamResponse({
			execute: async (dataStream) => {
				let i = 0
				let markdown = ''
				let prev = ''
				while (i < pages.length) {
					let previewPages: (
						| {
								type: 'text'
								text: string
						  }
						| {
								type: 'file'
								data: Uint8Array<ArrayBufferLike>
								mimeType: string
						  }
					)[] = []
					if (i !== pages.length - 1) {
						previewPages = [
							{
								type: 'text',
								text: 'Next pages for preview (do not generate on these pages)',
							},
							{
								type: 'file',
								data: pages[i + 1],
								mimeType: 'application/pdf',
							},
						]
					}
					const result = streamText({
						model: google('gemini-2.0-flash-001', {
							structuredOutputs: false,
						}),
						system: `
						- You are a pdf markdown generator, you must follow every instruction given to you with 100% accuracy (this is non-negotiable)
						- You will be given a pdf in chunks and convert it to markdown
						- The generated markdown will be merged together in a later stage
						- You will only generate the content in the pdf, no extra words
						- You cannot skip content unless its branding/footer that appears in every page or page number
						- You will be given a maximum of ${length} pages of pdf to convert
						- You will also be provided the previous generated markdown pages (if exist)
						- You will also be provided the next pdf pages for preview (if exist)
						- Accuracy is very important, generate the markdown in a way that retains its pdf structure (ie, correct use of headings, header size, tables and codeblocks)

						if a math equation is generated, wrap it around $ for katex inline styling and $$ for block
						example:

						(inline) 
						Pythagorean theorem: $a^2+b^2=c^2$

						(block)
						$$
						\mathcal{L}\{f\}(s) = \int_0^{\infty} {f(t)e^{-st}dt}
						$$

						There are rules you must follow:
						Do not repeat items from previous generated markdown (this is very important)
						Do not wrap the generated content in markdown codeblock, the frontend already assumed the generated string is in markdown format
						Only return the content

						NEVER START THE GENERATED CONTENT WITH \`\`\`
						Only return the content, dont wrap it in anything
						You have a habit of starting new page with triple tilde, stop that

						Never generate a codeblock unless its code (this is very important)
						Do not start the generated content with markdown codeblock
						There have been instance of you randomly generating codeblock on new page, this is unacceptable
						There have also been instances of you generating table rows as codeblock, use the previous generated markdown given to you the recognize if you are dealing with a codeblock or table if you're confused

						Always generate table as table
						DONT TRY TO FILL IN MISSING DATA OR ATTEMPT TO FIX BROKEN DATA
						Only generate codeblock unless you are absolutely certain it is code (python/javascript)

						Always generate table of content as nested list

						Always generate references as a list

						Generate flowchart/diagram as mermaid code

						The previous pages are given to you for reference
						For example: If the previous markdown cuts off with a table and the pdf given to you is a continuation of that table
						Do not generate the table headers again, just continue the table rows
						DO NOT COPY ANY MARKDOWN FROM PREVIOUS PAGES, YOU ARE ONLY ALLOWED TO GENERATE CONTENT THAT CONTINUES FROM THE PAGES

						Be especially careful at the end the of generated markdown, you will be continuing from there at the next stage
						Since you will be given the next pdf pages, you must use them to decide what to put at the end of your generated markdown
						For example:
						If your generated pages cuts off with a table, but the next pdf pages has the remaining table rows, do not close the table on the end of your generated pages
						Let the next round continue the rows
						Another example is dont close codeblock if the codeblock continues on the next pages

						Do not generate content on the preview pages

						Skip items such as branding
						Do not include the page number

						Feel free to add heading if it makes the markdown look better
						Ex: If the reference heading is small, you can make it big for better clarity
					`,
						experimental_transform: smoothStream({
							delayInMs: 0, // optional: defaults to 10ms
							chunking: 'line', // optional: defaults to 'word'
						}),
						messages: [
							{
								role: 'user',
								content: [
									{
										type: 'text',
										text:
											i > 0
												? 'Previous pages in markdown (do not repeat this in the generated content)'
												: 'No previous pages',
									},
									{ type: 'text', text: i > 0 ? prev : '' },
									{
										type: 'text',
										text: 'Convert the following pages',
									},
									{
										type: 'file',
										data: pages[i],
										mimeType: 'application/pdf',
									},
									...previewPages,
								],
							},
						],
					})

					result.mergeIntoDataStream(dataStream, {
						experimental_sendFinish:
							i === pages.length - 1 ? true : false,
						experimental_sendStart: i == 0 ? true : false,
					})
					const text = await result.text
					markdown += text
					prev = text
					i++
				}

				await db
					.update(document)
					.set({ markdown: markdown })
					.where(eq(document.id, pdf_id))

				await addEmbeddings(pdf_id, 'document', markdown)
			},
		})
	})

	.get('/:pdf_id/summary', async (c) => {
		let token = getCookie(c, 'session') ?? null
		if (!token || token.startsWith('free:')) {
			return c.text('You must be logged in to use this feature', {
				status: 400,
			})
		}

		const pdf_id = c.req.param('pdf_id')

		const pdfData = await db.query.document.findFirst({
			where: (document, { eq, and }) =>
				and(eq(document.id, pdf_id), eq(document.type, 'pdf')),
		})

		if (!pdfData) {
			return c.text('Invalid ID', { status: 400 })
		}

		if (pdfData.summary) {
			c.header('Content-Type', 'application/json')
			return c.json({ summary: pdfData.summary })
		}

		const markdown = pdfData.markdown
		if (!markdown) {
			return c.text('No Markdown', 400)
		}

		return createDataStreamResponse({
			execute: async (dataStream) => {
				const result = streamText({
					model: google('gemini-2.5-flash-preview-04-17', {
						structuredOutputs: false,
					}),
					maxSteps: 5,
					experimental_continueSteps: true,
					system: `
					- You are a pdf summarizer
					- You will be given a markdown version of the pdf content
					- You will generate the summary using the markdown content
					- do not use quotes or colons
					- only return the summary

					if a math equation is generated, wrap it around $$ for katex inline styling and $$ for block
					example:

					(inline) 
					Pythagorean theorem: $$a^2+b^2=c^2$$

					(block)
					$$
					\mathcal{L}\{f\}(s) = \int_0^{\infty} {f(t)e^{-st}dt}
					$$

					Contain as much information as possible while keeping it concise
					To make a good summary length is not the only factor, 
					how much the data is cut out is also important, 
					so keep as much information as possible while keeping it not too long
				`,
					prompt: markdown,
					onFinish: async ({ text }) => {
						await db
							.update(document)
							.set({ summary: text })
							.where(eq(document.id, pdf_id))
					},
				})

				result.mergeIntoDataStream(dataStream)
			},
		})
	})

	.get('/:pdf_id', async (c) => {
		const token = getCookie(c, 'session') ?? null

		if (token === null) {
			return c.json({ pdf: null })
		}

		const { session, user } = await validateSessionToken(token)

		if (!user) {
			return c.json({ pdf: null })
		}

		if (session !== null) {
			setSessionTokenCookie(c, token, session.expiresAt)
		} else {
			deleteSessionTokenCookie(c)
		}

		const pdf_id = c.req.param('pdf_id')

		const pdfData = await db.query.document.findFirst({
			where: (document, { eq, and }) =>
				and(
					eq(document.id, pdf_id),
					eq(document.type, 'pdf'),
					eq(document.userId, user.id),
				),
		})

		if (!pdfData) {
			return c.text('Invalid ID', { status: 400 })
		}
		return c.json({
			pdf: pdfData,
		})
	})

	.post(
		'/:pdf_id',
		authMiddleware,
		zValidator(
			'json',
			z.object({
				messages: z.any(),
				provider: modelSchema,
				searchGrounding: z.boolean().default(false),
				mode: z
					.union([
						z.literal('x_search'),
						z.literal('chat'),
						z.literal('web_search'),
						z.literal('academic_search'),
						z.literal('web_reader'),
					])
					.default('chat'),
				markdown: z.string(),
			}),
		),
		async (c) => {
			const { messages, provider, searchGrounding, mode, markdown } =
				c.req.valid('json')

			const {
				coreMessages,
				error: processMessageError,
				userMessage,
				userMessageDate,
			} = processMessages({ provider, messages })

			if (processMessageError !== undefined) {
				return c.text(processMessageError, { status: 400 })
			}

			const modelDetails = getModel({
				provider,
				searchGrounding,
			})

			if (modelDetails.error !== null) {
				return c.text(modelDetails.error, 400)
			}

			const { contextSize, error, model, providerOptions } =
				modelDetails

			let useEmbeddings = false
			if (Math.floor(markdown.length / 4) >= contextSize) {
				useEmbeddings = false
			}

			const pdf_id = c.req.param('pdf_id')

			const pdfData = await db.query.document.findFirst({
				where: (document, { eq, and }) =>
					and(eq(document.id, pdf_id), eq(document.type, 'pdf')),
			})

			if (!pdfData) {
				return c.text('Invalid ID', { status: 400 })
			}

			const getTools = ({
				useEmbeddings,
			}: {
				useEmbeddings: boolean
			}) => {
				const toolList = {
					getInformation: tool({
						description: `get information from your knowledge base to answer questions.`,
						parameters: z.object({
							question: z.string().describe('the users question'),
						}),
						execute: async ({ question }) => {
							const content = await findRelevantContent(question)
							return content
						},
					}),
				}

				return useEmbeddings ? toolList : {}
			}

			return createDataStreamResponse({
				execute: async (dataStream) => {
					const result = streamText({
						model: model,
						// - Since most pdf is too big, you will be given a tool to search for relevant data based on the user query
						// - You are allowed to only use the tool once per query, it will return 10 most relevant content based the user's question
						system: `
						- You are a pdf chat
						- You will be given a markdown of the pdf document which has been parsed into the correct format, ie: tables and code
						- You will be answering user's questions based on this pdf

						if a math equation is generated, wrap it around $$ for katex inline styling and $$ for block
						example:

						(inline) 
						Pythagorean theorem: $$a^2+b^2=c^2$$

						(block)
						$$
						\mathcal{L}\{f\}(s) = \int_0^{\infty} {f(t)e^{-st}dt}
						$$

						${
							useEmbeddings
								? ''
								: `
						Here is the markdown of the pdf
						${markdown}
						`
						}
					`,
						messages: coreMessages,
						tools: {
							...getTools({ useEmbeddings }),
						},
						onFinish: async ({
							response,
							usage,
							reasoning,
							providerMetadata,
						}) => {},
					})

					result.mergeIntoDataStream(dataStream)
				},
			})
		},
	)

	.delete('/:pdf_id', authMiddleware, async (c) => {
		const user = c.var.user

		const pdf_id = c.req.param('pdf_id')

		const deletedPDFs = await db
			.delete(document)
			.where(
				and(
					eq(document.id, pdf_id),
					eq(document.type, 'pdf'),
					eq(document.userId, user.id),
				),
			)
			.returning()

		if (deletedPDFs.length > 0) {
			const deletedPDF = deletedPDFs[0]

			await db
				.delete(embeddings)
				.where(
					and(
						eq(embeddings.resourceType, 'document'),
						eq(embeddings.resourceId, deletedPDF.id),
					),
				)

			const deletedFiles = await db
				.delete(upload)
				.where(and(eq(upload.id, deletedPDF.uploadId)))
				.returning()
			if (deletedFiles.length > 0) {
				const deletedFile = deletedFiles[0]
				const s3file = s3Client.file(deletedFile.key)

				await s3file.delete()
			}
		}

		return c.json({ success: true }, 200)
	})

export { app as PDFRoutes }
