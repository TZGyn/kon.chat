import { PUBLIC_APP_URL } from '$env/static/public'
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
	baseURL: PUBLIC_APP_URL, // The base URL of your auth server
})
