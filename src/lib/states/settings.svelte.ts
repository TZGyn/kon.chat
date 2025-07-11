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
	mistralApiKey: null,
	xaiApiKey: null,

	exaApiKey: null,
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
		mistralApiKey,
		xAIApiKey,

		exaApiKey,
	}: {
		additionalSystemPrompt?: string
		nameForLLM?: string
		claudeApiKey?: string | null
		geminiApiKey?: string | null
		openAIApiKey?: string | null
		openRouterApiKey?: string | null
		mistralApiKey?: string | null
		xAIApiKey?: string | null

		exaApiKey?: string | null
	}) => {
		await client.user.settings.$post({
			json: {
				additional_system_prompt: additionalSystemPrompt,
				anthropic_api_key: claudeApiKey,
				google_api_key: geminiApiKey,
				name: nameForLLM,
				open_router_api_key: openRouterApiKey,
				openai_api_key: openAIApiKey,
				mistral_api_key: mistralApiKey,
				xai_api_key: xAIApiKey,

				exa_api_key: exaApiKey,
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
