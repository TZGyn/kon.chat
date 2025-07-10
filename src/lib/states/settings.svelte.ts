import { makeClient } from '$api/api-client'
import type { Setting } from '$api/db/type'
import { onMount } from 'svelte'

let settings = $state<Omit<Setting, 'userId'>>({
	additionalSystemPrompt: '',
	nameForLLM: '',
	claudeApiKey: null,
	geminiApiKey: null,
	openAIApiKey: null,
	openRouterApiKey: null,
})

export const useSettings = () => {
	const client = makeClient(fetch)

	onMount(() => {
		refetch()
	})

	const refetch = async () => {
		const response = await client.user.settings.$get()

		if (response.status === 200) {
			const data = await response.json()
			settings = data.settings
		}
	}

	const update = async ({
		additionalSystemPrompt,
		claudeApiKey,
		geminiApiKey,
		nameForLLM,
		openAIApiKey,
		openRouterApiKey,
	}: {
		additionalSystemPrompt?: string
		nameForLLM?: string
		claudeApiKey?: string | null
		geminiApiKey?: string | null
		openAIApiKey?: string | null
		openRouterApiKey?: string | null
	}) => {
		await client.user.settings.$post({
			json: {
				additional_system_prompt: additionalSystemPrompt,
				anthropic_api_key: claudeApiKey,
				google_api_key: geminiApiKey,
				name: nameForLLM,
				open_router_api_key: openRouterApiKey,
				openai_api_key: openAIApiKey,
			},
		})
		refetch()
	}
	return {
		get settings() {
			return settings
		},
		refetch,
		update,
	}
}
