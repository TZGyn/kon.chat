import { GitHub, Google } from 'arctic'

export const google = new Google(
	Bun.env.GOOGLE_OAUTH_CLIENT_ID!,
	Bun.env.GOOGLE_OAUTH_CLIENT_SECRET!,
	Bun.env.APP_URL + '/auth/login/google/callback',
)

export const github = new GitHub(
	Bun.env.GITHUB_OAUTH_CLIENT_ID!,
	Bun.env.GITHUB_OAUTH_CLIENT_SECRET!,
	null,
)
