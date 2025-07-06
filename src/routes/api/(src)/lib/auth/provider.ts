import { GitHub, Google } from 'arctic'
import {
	GOOGLE_OAUTH_CLIENT_ID,
	GOOGLE_OAUTH_CLIENT_SECRET,
	GITHUB_OAUTH_CLIENT_ID,
	GITHUB_OAUTH_CLIENT_SECRET,
} from '$env/static/private'
import { PUBLIC_APP_URL } from '$env/static/public'

export const google = new Google(
	GOOGLE_OAUTH_CLIENT_ID,
	GOOGLE_OAUTH_CLIENT_SECRET!,
	PUBLIC_APP_URL + '/api/auth/login/google/callback',
)

export const github = new GitHub(
	GITHUB_OAUTH_CLIENT_ID,
	GITHUB_OAUTH_CLIENT_SECRET,
	null,
)
