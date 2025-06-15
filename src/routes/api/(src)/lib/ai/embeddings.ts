import { embed, embedMany } from 'ai'
import { google } from './model'
import { db } from '$api/db'
import {
	embeddings,
	embeddings as embeddingsTable,
} from '$api/db/schema'
import { nanoid } from '$api/utils'
import { cosineDistance, desc, gt, sql } from 'drizzle-orm'

const embeddingModel = google.textEmbeddingModel('text-embedding-004')

const generateChunks = (input: string): string[] => {
	return input
		.trim()
		.split('\n\n')
		.filter((i) => i !== '')
}

export const generateEmbeddings = async (
	value: string,
): Promise<Array<{ embedding: number[]; content: string }>> => {
	const chunks = generateChunks(value)
	const chunkSize = 100,
		chunkArray = []
	for (let i = 0; i < Math.ceil(chunks.length / chunkSize); i++) {
		chunkArray[i] = chunks.slice(i * chunkSize, (i + 1) * chunkSize)
	}

	const res = await Promise.all(
		chunkArray.map(async (chunks, i) => {
			const { embeddings } = await embedMany({
				model: embeddingModel,
				values: chunks,
			})
			return embeddings.map((e, i) => ({
				content: chunks[i],
				embedding: e,
			}))
		}),
	)
	return res.flat()
}

export const addEmbeddings = async (
	resourceId: string,
	resourceType: 'document',
	content: string,
) => {
	try {
		const embeddings = await generateEmbeddings(content)
		await db.insert(embeddingsTable).values(
			embeddings.map((embedding) => ({
				id: nanoid(),
				resourceId: resourceId,
				resourceType: resourceType,
				...embedding,
			})),
		)
		return 'Resource successfully created and embedded.'
	} catch (error) {
		console.log(error)
		return error instanceof Error && error.message.length > 0
			? error.message
			: 'Error, please try again.'
	}
}

export const generateEmbedding = async (
	value: string,
): Promise<number[]> => {
	const input = value.replaceAll('\\n', ' ')
	const { embedding } = await embed({
		model: embeddingModel,
		value: input,
	})
	return embedding
}

export const findRelevantContent = async (userQuery: string) => {
	const userQueryEmbedded = await generateEmbedding(userQuery)
	const similarity = sql<number>`1 - (${cosineDistance(
		embeddings.embedding,
		userQueryEmbedded,
	)})`
	const similarGuides = await db
		.select({ name: embeddings.content, similarity })
		.from(embeddings)
		.where(gt(similarity, 0.5))
		.orderBy((t) => desc(t.similarity))
		.limit(10)
	return similarGuides
}
