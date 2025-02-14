export const load = async ({ params, url }) => {
	return {
		chat_id: params.chat_id,
		isNew: url.searchParams.get('type') === 'new',
	}
}
