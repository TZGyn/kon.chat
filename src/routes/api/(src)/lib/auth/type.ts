import type { Session, User } from '$api/db/type'

export type AuthType = {
	user: User
	session: Session
}
