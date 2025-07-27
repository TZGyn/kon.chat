import { makeClient } from '$api/api-client'
import { onMount } from 'svelte'

let capabilities = $state<{
	available_providers: (
		| 'openai'
		| 'anthropic'
		| 'google'
		| 'xai'
		| 'mistral'
		| 'open_router'
	)[]
	search: boolean
}>({
	available_providers: [],
	search: false,
})

export const useCapabilities = () => {
	const refetch = async () => {
		const response = await makeClient(fetch).user.capabilties.$get()

		if (response.status === 200) {
			capabilities = await response.json()

			localStorage.setItem(
				'capabilities',
				JSON.stringify(capabilities || {}),
			)
		} else {
			capabilities = {
				available_providers: [],
				search: false,
			}
		}
	}

	onMount(() => {
		refetch()
	})

	return {
		get capabilities() {
			return capabilities
		},
		refetch,
	}
}
