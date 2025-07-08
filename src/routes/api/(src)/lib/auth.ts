import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin, apiKey } from 'better-auth/plugins'
import {
	BETTER_AUTH_SECRET,
	BETTER_AUTH_ENABLE_SIGNUP,
} from '$env/static/private'
import { PUBLIC_APP_URL } from '$env/static/public'
import * as schema from './db/schema.js'

import {
	chat,
	document,
	embeddings,
	message,
	upload,
	user,
} from './db/schema'
import { db } from './db/index.js'
import { and, eq, inArray } from 'drizzle-orm'
import { getUploadIDsFromMessages } from './chat/attachments.js'
import { s3Client } from './s3'

import {
	GOOGLE_OAUTH_CLIENT_ID,
	GOOGLE_OAUTH_CLIENT_SECRET,
	GITHUB_OAUTH_CLIENT_ID,
	GITHUB_OAUTH_CLIENT_SECRET,
} from '$env/static/private'

export const auth = betterAuth({
	baseURL: PUBLIC_APP_URL,
	secret: BETTER_AUTH_SECRET,
	emailAndPassword: {
		enabled: true,
		disableSignUp: BETTER_AUTH_ENABLE_SIGNUP !== 'true',
	},
	socialProviders: {
		google: {
			disableSignUp: BETTER_AUTH_ENABLE_SIGNUP !== 'true',
			clientId: GOOGLE_OAUTH_CLIENT_ID,
			clientSecret: GOOGLE_OAUTH_CLIENT_SECRET,
		},
		github: {
			disableSignUp: BETTER_AUTH_ENABLE_SIGNUP !== 'true',
			clientId: GITHUB_OAUTH_CLIENT_ID,
			clientSecret: GITHUB_OAUTH_CLIENT_SECRET,
		},
	},
	plugins: [admin()],
	database: drizzleAdapter(db, {
		provider: 'pg',
		schema: schema,
	}),
	user: {
		deleteUser: {
			enabled: true,
			beforeDelete: async (user, request) => {
				const loggedInUser = user
				const chats = await db.query.chat.findMany({
					where: (chat, t) =>
						t.and(t.eq(chat.userId, loggedInUser.id)),
				})

				if (chats.length > 0) {
					await db.delete(chat).where(
						inArray(
							chat.id,
							chats.map((chat) => chat.id),
						),
					)

					const messages = await db
						.delete(message)
						.where(
							inArray(
								message.chatId,
								chats.map((chat) => chat.id),
							),
						)
						.returning()

					const uploads = getUploadIDsFromMessages(messages)

					if (uploads.length > 0) {
						const deletedUploads = await db
							.delete(upload)
							.where(inArray(upload.id, uploads))
							.returning()

						await Promise.all(
							deletedUploads.map(async (upload) => {
								const file = s3Client.file(upload.key)
								await file.delete()
							}),
						)
					}
				}

				const documents = await db
					.delete(document)
					.where(eq(document.userId, loggedInUser.id))
					.returning()

				if (documents.length > 0) {
					await db.delete(embeddings).where(
						and(
							eq(embeddings.resourceType, 'document'),
							inArray(
								embeddings.resourceId,
								documents.map((document) => document.id),
							),
						),
					)

					const deletedUploads = await db
						.delete(upload)
						.where(
							inArray(
								upload.id,
								documents.map((document) => document.uploadId),
							),
						)
						.returning()

					await Promise.all(
						deletedUploads.map(async (upload) => {
							const file = s3Client.file(upload.key)
							await file.delete()
						}),
					)
				}
			},
		},
	},
})

export type AuthType = {
	user: typeof auth.$Infer.Session.user | null
	session: typeof auth.$Infer.Session.session | null
}
