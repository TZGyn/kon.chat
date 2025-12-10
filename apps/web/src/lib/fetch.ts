import { PUBLIC_API_URL } from '$env/static/public'
import { makeClient } from '@kon.chat/backend'

export const customFetch = async <T>(
	url: string,
	props?: RequestInit,
) => {
	return (
		await fetch(PUBLIC_API_URL + url, {
			credentials: 'include',
			...props,
		})
	).json() as T
}

export const customFetchRaw = async (
	url: string,
	props?: RequestInit,
) => {
	return await fetch(PUBLIC_API_URL + url, {
		credentials: 'include',
		...props,
	})
}

export const client = makeClient(PUBLIC_API_URL, fetch)
