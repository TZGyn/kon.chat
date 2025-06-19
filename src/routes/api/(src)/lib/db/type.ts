import type { InferSelectModel } from 'drizzle-orm'
import { chat, document, message, session, user } from './schema'

export type User = InferSelectModel<typeof user>
export type Session = InferSelectModel<typeof session>
export type Chat = InferSelectModel<typeof chat>
export type Message = InferSelectModel<typeof message>
export type PDF = InferSelectModel<typeof document>
