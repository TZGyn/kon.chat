import { PUBLIC_API_URL } from '$env/static/public'
import { createAuthClient } from 'better-auth/svelte'
import { adminClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
	baseURL: PUBLIC_API_URL, // The base URL of your auth server
	basePath: '/auth',
	plugins: [adminClient()],
})
