import { env } from '$env/dynamic/public'

export const customFetch = async <T>(
	url: string,
	props?: RequestInit,
) => {
	return (
		await fetch(env.PUBLIC_API_URL + url, {
			credentials: 'include',
			...props,
		})
	).json() as T
}
