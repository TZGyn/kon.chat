import { PUBLIC_APP_URL } from '$env/static/public'
import { createAuthClient } from 'better-auth/svelte'
import { adminClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
	baseURL: PUBLIC_APP_URL, // The base URL of your auth server
	plugins: [adminClient()],
})
