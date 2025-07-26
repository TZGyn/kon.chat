import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin, apiKey } from 'better-auth/plugins'
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
import type { Setting } from './db/type.js'

export const auth = betterAuth({
	baseURL: Bun.env.PUBLIC_API_URL,
	trustedOrigins: [Bun.env.PUBLIC_APP_URL],
	basePath: '/auth',
	secret: Bun.env.BETTER_AUTH_SECRET,
	emailAndPassword: {
		enabled: true,
		disableSignUp: Bun.env.BETTER_AUTH_ENABLE_SIGNUP !== 'true',
	},
	socialProviders: {
		google: {
			enabled:
				!!Bun.env.GOOGLE_OAUTH_CLIENT_ID &&
				!!Bun.env.GOOGLE_OAUTH_CLIENT_SECRET,
			disableSignUp: Bun.env.BETTER_AUTH_ENABLE_SIGNUP !== 'true',
			clientId: Bun.env.GOOGLE_OAUTH_CLIENT_ID,
			clientSecret: Bun.env.GOOGLE_OAUTH_CLIENT_SECRET,
		},
		github: {
			enabled:
				!!Bun.env.GITHUB_OAUTH_CLIENT_ID &&
				!!Bun.env.GITHUB_OAUTH_CLIENT_SECRET,
			disableSignUp: Bun.env.BETTER_AUTH_ENABLE_SIGNUP !== 'true',
			clientId: Bun.env.GITHUB_OAUTH_CLIENT_ID,
			clientSecret: Bun.env.GITHUB_OAUTH_CLIENT_SECRET,
		},
	},
	account: {
		accountLinking: {
			enabled: true,
		},
	},
	plugins: [admin()],
	database: drizzleAdapter(db, {
		provider: 'pg',
		schema: schema,
	}),
	user: {
		changeEmail: {
			enabled: true,
		},
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
	user: typeof auth.$Infer.Session.user
	session: typeof auth.$Infer.Session.session
	setting: Setting
}
