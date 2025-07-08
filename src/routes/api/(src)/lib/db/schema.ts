import { index, pgTable } from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'

export const user = pgTable('user', (t) => ({
	id: t.text('id').primaryKey(),
	name: t.text('name').notNull().default(''),
	email: t.text('email').notNull().unique(),
	emailVerified: t
		.boolean('email_verified')
		.$defaultFn(() => false)
		.notNull()
		.default(false),
	image: t.text('image'),
	createdAt: t
		.timestamp('created_at')
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull()
		.defaultNow(),
	updatedAt: t
		.timestamp('updated_at')
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull()
		.defaultNow(),
	role: t.text('role'),
	banned: t.boolean('banned'),
	banReason: t.text('ban_reason'),
	banExpires: t.timestamp('ban_expires'),

	googleId: t.varchar('google_id', { length: 255 }),
	githubId: t.varchar('github_id', { length: 255 }),
}))

export const session = pgTable('session', (t) => ({
	id: t.text('id').primaryKey(),
	expiresAt: t.timestamp('expires_at').notNull().defaultNow(),
	token: t
		.text('token')
		.notNull()
		.unique()
		.default(sql`md5(random()::text)`),
	createdAt: t.timestamp('created_at').notNull().defaultNow(),
	updatedAt: t.timestamp('updated_at').notNull().defaultNow(),
	ipAddress: t.text('ip_address'),
	userAgent: t.text('user_agent'),
	userId: t
		.text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	impersonatedBy: t.text('impersonated_by'),
}))

export const account = pgTable('account', (t) => ({
	id: t.text('id').primaryKey(),
	accountId: t.text('account_id').notNull(),
	providerId: t.text('provider_id').notNull(),
	userId: t
		.text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	accessToken: t.text('access_token'),
	refreshToken: t.text('refresh_token'),
	idToken: t.text('id_token'),
	accessTokenExpiresAt: t.timestamp('access_token_expires_at'),
	refreshTokenExpiresAt: t.timestamp('refresh_token_expires_at'),
	scope: t.text('scope'),
	password: t.text('password'),
	createdAt: t.timestamp('created_at').notNull(),
	updatedAt: t.timestamp('updated_at').notNull(),
}))

export const verification = pgTable('verification', (t) => ({
	id: t.text('id').primaryKey(),
	identifier: t.text('identifier').notNull(),
	value: t.text('value').notNull(),
	expiresAt: t.timestamp('expires_at').notNull(),
	createdAt: t
		.timestamp('created_at')
		.$defaultFn(() => /* @__PURE__ */ new Date()),
	updatedAt: t
		.timestamp('updated_at')
		.$defaultFn(() => /* @__PURE__ */ new Date()),
}))

export const setting = pgTable('setting', (t) => ({
	userId: t
		.text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	nameForLLM: t
		.varchar('name_for_llm', { length: 255 })
		.notNull()
		.default(''),
	additionalSystemPrompt: t
		.text('additional_system_prompt')
		.notNull()
		.default(''),
	openAIApiKey: t.text('openai_api_key'),
	geminiApiKey: t.text('gemini_api_key'),
	claudeApiKey: t.text('claude_api_key'),
	openRouterApiKey: t.text('openrouter_api_key'),
}))

export const model = pgTable('model', (t) => ({
	id: t.text('id').primaryKey(),
	userId: t.text('user_id').notNull(),
	provider: t.varchar('provider', { length: 255 }).notNull(),
	model: t.varchar('model', { length: 255 }).notNull(),
	image: t.boolean('image').notNull().default(false),
	file: t.boolean('file').notNull().default(false),
	fast: t.boolean('fast').notNull().default(false),
	reasoning: t.boolean('reasoning').notNull().default(false),
	searchGrounding: t
		.boolean('search_grounding')
		.notNull()
		.default(false),
}))

export const upload = pgTable('upload', (t) => ({
	id: t.text('id').primaryKey(),
	userId: t.text('user_id').notNull(),
	key: t.text('key').notNull(),
	name: t.text('name').notNull(),
	size: t.bigint('size', { mode: 'number' }).notNull(),
	mimeType: t.varchar('mime_type', { length: 255 }).notNull(),
	visibility: t
		.varchar('visibility', { length: 255 })
		.$type<'private' | 'public'>()
		.notNull()
		.default('private'),
	createdAt: t.bigint('created_at', { mode: 'number' }).notNull(),
}))

export const chat = pgTable('chat', (t) => ({
	id: t.text('id').primaryKey(),
	userId: t.text('user_id').notNull(),
	title: t.text('title').notNull(),
	visibility: t
		.varchar('visibility', { length: 255 })
		.$type<'private' | 'public'>()
		.notNull()
		.default('private'),
	createdAt: t.bigint('created_at', { mode: 'number' }).notNull(),
	updatedAt: t
		.bigint('updated_at', { mode: 'number' })
		.notNull()
		.default(0),
}))

export const message = pgTable('message', (t) => ({
	id: t.text('id').primaryKey().notNull(),
	chatId: t.text('chat_id').notNull(),
	responseId: t
		.varchar('response_id')
		.notNull()
		.default(sql`md5(random()::text)`),
	role: t.varchar('role').notNull(),
	content: t.json('content').notNull(),
	model: t.varchar('model'),
	provider: t.varchar('provider'),
	providerMetadata: t.json('provider_metadata').notNull().default({}),
	promptTokens: t
		.bigint('prompt_tokens', { mode: 'number' })
		.notNull(),
	completionTokens: t
		.bigint('completion_tokens', {
			mode: 'number',
		})
		.notNull(),
	totalTokens: t.bigint('total_tokens', { mode: 'number' }).notNull(),
	createdAt: t.bigint('created_at', { mode: 'number' }).notNull(),
}))

export const youtube = pgTable('youtube', (t) => ({
	id: t.varchar('id', { length: 255 }).primaryKey().notNull(),
	channelName: t.text('channel_name').notNull(),
	channelUrl: t.varchar('channel_url', { length: 255 }).notNull(),
	channelThumbnailUrl: t.text('channel_thumbnail_url').notNull(),
	title: t.text('title').notNull(),
	description: t.text('description').notNull(),
	descriptionHTML: t.text('description_html').notNull(),
	transcript: t.json('transcript').notNull(),
	summary: t.text('summary').notNull(),
	uploadTime: t.text('upload_time').notNull(),
	createdAt: t.bigint('created_at', { mode: 'number' }).notNull(),
}))

export const document = pgTable('document', (t) => ({
	id: t.varchar('id', { length: 255 }).primaryKey().notNull(),
	userId: t.text('user_id').notNull(),
	type: t.varchar('type').$type<'pdf'>().notNull(),
	name: t.varchar('name', { length: 255 }).notNull(),
	uploadId: t.text('upload_id').notNull(),
	markdown: t.text('markdown'),
	summary: t.text('summary'),
	createdAt: t.bigint('created_at', { mode: 'number' }).notNull(),
}))

export const embeddings = pgTable(
	'embeddings',
	(t) => ({
		id: t.varchar('id', { length: 255 }).primaryKey(),
		resourceType: t
			.varchar('resource_type', { length: 255 })
			.$type<'document'>()
			.notNull(),
		resourceId: t.varchar('resource_id', { length: 255 }).notNull(),
		content: t.text('content').notNull(),
		embedding: t.vector('embedding', { dimensions: 768 }).notNull(),
	}),
	(table) => [
		index('embeddingIndex').using(
			'hnsw',
			table.embedding.op('vector_cosine_ops'),
		),
	],
)

export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	models: many(model),
}))

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id],
	}),
}))

export const chatRelations = relations(chat, ({ one, many }) => ({
	user: one(user, {
		fields: [chat.userId],
		references: [user.id],
	}),
	messages: many(message),
}))

export const messageRelations = relations(message, ({ one }) => ({
	chat: one(chat, {
		fields: [message.chatId],
		references: [chat.id],
	}),
}))

export const documentRelations = relations(document, ({ one }) => ({
	upload: one(upload, {
		fields: [document.uploadId],
		references: [upload.id],
	}),
}))

export const modelRelations = relations(model, ({ one }) => ({
	user: one(user, {
		fields: [model.userId],
		references: [user.id],
	}),
}))
