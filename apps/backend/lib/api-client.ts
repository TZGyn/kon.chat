import type { Router } from '../src/index'
import { hc } from 'hono/client'

let browserClient: ReturnType<typeof hc<Router>>

export const makeClient = (url: string, fetch: Window['fetch']) => {
	const isBrowser = typeof window !== 'undefined'
	const origin = isBrowser ? window.location.origin : ''

	if (isBrowser && browserClient) {
		return browserClient
	}

	const client = hc<Router>(url, {
		fetch,
		init: { credentials: 'include' },
	})

	if (isBrowser) {
		browserClient = client
	}

	return client
}
