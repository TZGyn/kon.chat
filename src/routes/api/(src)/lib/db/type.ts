import type { InferSelectModel } from 'drizzle-orm'
import {
	chat,
	document,
	message,
	model,
	session,
	setting,
	user,
} from './schema'
import type { auth } from '$api/auth'

export type User = typeof auth.$Infer.Session.user
export type Session = InferSelectModel<typeof session>
export type Chat = InferSelectModel<typeof chat>
export type Message = InferSelectModel<typeof message>
export type PDF = InferSelectModel<typeof document>
export type Model = InferSelectModel<typeof model>
export type Setting = InferSelectModel<typeof setting>
