export const customFetch = async <T>(
	url: string,
	props?: RequestInit,
) => {
	return (
		await fetch('/api' + url, {
			credentials: 'include',
			...props,
		})
	).json() as T
}

export const customFetchRaw = async (
	url: string,
	props?: RequestInit,
) => {
	return await fetch('/api' + url, {
		credentials: 'include',
		...props,
	})
}
