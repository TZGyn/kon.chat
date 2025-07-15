import { PUBLIC_API_URL } from '$env/static/public'
import type { Router } from '../index'
import { hc } from 'hono/client'

let browserClient: ReturnType<typeof hc<Router>>

export const makeClient = (fetch: Window['fetch']) => {
	const isBrowser = typeof window !== 'undefined'
	const origin = isBrowser ? window.location.origin : ''

	if (isBrowser && browserClient) {
		return browserClient
	}

	const client = hc<Router>(PUBLIC_API_URL, {
		fetch,
		init: { credentials: 'include' },
	})

	if (isBrowser) {
		browserClient = client
	}

	return client
}
