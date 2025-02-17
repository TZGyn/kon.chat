import { PUBLIC_API_URL } from '$env/static/public'

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
