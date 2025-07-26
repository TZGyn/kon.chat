import { makeClient } from '$api/api-client'
import { onMount } from 'svelte'

export type Model = {
	name: string
	info: string
	provider: string
	id: string
	capabilities: {
		image: boolean
		file: boolean
		fast: boolean
		reasoning: boolean
		searchGrounding: boolean

		thinkingBudget?: {
			enable: boolean
			min: number
			max: number
		}
	}
}

let available_models = $state<
	(
		| 'openai'
		| 'anthropic'
		| 'google'
		| 'xai'
		| 'mistral'
		| 'open_router'
	)[]
>([])

let customModels = $state<Model[]>([])

export const useModels = () => {
	const getAvailableModels = async () => {
		available_models = JSON.parse(
			localStorage.getItem('available_models') || '[]',
		)
		const response = await makeClient(fetch).user.capabilties.$get()

		if (response.status === 200) {
			available_models = (await response.json()).available_providers

			localStorage.setItem(
				'available_models',
				JSON.stringify(available_models || []),
			)
		}
	}

	const getModels = async () => {
		customModels = JSON.parse(
			localStorage.getItem('custom_models') || '[]',
		)
		const response =
			await makeClient(fetch).model.available_models.$get()

		if (response.status === 200) {
			customModels = (await response.json()).custom_models.map(
				(model) => {
					return {
						info: '',
						id: model.model,
						name: model.model,
						provider: model.provider,
						capabilities: {
							fast: model.fast,
							file: model.file,
							image: model.image,
							reasoning: model.reasoning,
							searchGrounding: model.searchGrounding,
						},
					}
				},
			)
		}

		localStorage.setItem(
			'available_models',
			JSON.stringify(available_models || []),
		)
	}

	onMount(() => {
		getAvailableModels()
		getModels()
	})

	let models = $derived([
		{
			name: 'Gemini 2.0 Flash',
			info: '',
			provider: 'google',
			id: 'gemini-2.0-flash-001',
			capabilities: {
				image: true,
				file: true,
				fast: false,
				reasoning: false,
				searchGrounding: true,
			},
		},
		{
			name: 'GPT 4.1',
			info: '',
			provider: 'openai',
			id: 'gpt-4.1',
			capabilities: {
				image: true,
				file: false,
				fast: false,
				reasoning: false,
				searchGrounding: false,
			},
		},
		{
			name: 'GPT 4.1 mini',
			info: '',
			provider: 'openai',
			id: 'gpt-4.1-mini',
			capabilities: {
				image: true,
				file: false,
				fast: false,
				reasoning: false,
				searchGrounding: false,
			},
		},
		{
			name: 'GPT 4.1 nano',
			info: '',
			provider: 'openai',
			id: 'gpt-4.1-nano',
			capabilities: {
				image: true,
				file: false,
				fast: false,
				reasoning: false,
				searchGrounding: false,
			},
		},
		{
			name: 'GPT 4o mini',
			info: '',
			provider: 'openai',
			id: 'gpt-4o-mini',
			capabilities: {
				image: true,
				file: false,
				fast: false,
				reasoning: false,
				searchGrounding: false,
			},
		},
		{
			name: 'GPT 4o',
			info: '',
			provider: 'openai',
			id: 'gpt-4o',
			capabilities: {
				image: true,
				file: false,
				fast: false,
				reasoning: false,
				searchGrounding: false,
			},
		},
		{
			name: 'o3 mini',
			info: '',
			provider: 'openai',
			id: 'o3-mini',
			capabilities: {
				image: false,
				file: false,
				fast: false,
				reasoning: true,
				searchGrounding: false,
			},
		},
		{
			name: 'o4 mini',
			info: '',
			provider: 'openai',
			id: 'o4-mini',
			capabilities: {
				image: true,
				file: false,
				fast: false,
				reasoning: true,
				searchGrounding: false,
			},
		},
		{
			name: 'Gemini 2.5 Flash Preview',
			info: '',
			provider: 'google',
			id: 'gemini-2.5-flash-preview-04-17',
			capabilities: {
				image: true,
				file: false,
				fast: false,
				reasoning: false,
				searchGrounding: true,
				thinkingBudget: {
					enable: true,
					min: 0,
					max: 24576,
				},
			},
		},
		{
			name: 'Grok 2',
			info: '',
			provider: 'xai',
			id: 'grok-2-1212',
			capabilities: {
				image: false,
				file: false,
				fast: false,
				reasoning: false,
				searchGrounding: false,
			},
		},
		{
			name: 'Grok 2 Vision',
			info: '',
			provider: 'xai',
			id: 'grok-2-vision-1212',
			capabilities: {
				image: true,
				file: false,
				fast: false,
				reasoning: false,
				searchGrounding: false,
			},
		},
		{
			name: 'Grok 3 Beta',
			info: '',
			provider: 'xai',
			id: 'grok-3-beta',
			capabilities: {
				image: false,
				file: false,
				fast: false,
				reasoning: false,
				searchGrounding: false,
			},
		},
		{
			name: 'Grok 3 Mini Beta',
			info: '',
			provider: 'xai',
			id: 'grok-3-mini-beta',
			capabilities: {
				image: false,
				file: false,
				fast: false,
				reasoning: true,
				searchGrounding: false,
			},
		},
		{
			name: 'Mistral Small',
			info: '',
			provider: 'mistral',
			id: 'mistral-small-latest',
			capabilities: {
				image: false,
				file: false,
				fast: false,
				reasoning: false,
				searchGrounding: false,
			},
		},
		{
			name: 'Claude 3.5 Sonnet',
			info: '',
			provider: 'anthropic',
			id: 'claude-3-5-sonnet-latest',
			capabilities: {
				image: true,
				file: true,
				fast: false,
				reasoning: false,
				searchGrounding: false,
			},
		},
		{
			name: 'Claude 3.7 Sonnet',
			info: '',
			provider: 'anthropic',
			id: 'claude-3-7-sonnet-20250219',
			capabilities: {
				image: true,
				file: true,
				fast: false,
				reasoning: true,
				searchGrounding: false,
			},
		},
		{
			name: 'Claude 4 Sonnet',
			info: '',
			provider: 'anthropic',
			id: 'claude-4-sonnet-20250514',
			capabilities: {
				image: true,
				file: true,
				fast: false,
				reasoning: true,
				searchGrounding: false,
			},
		},
	] as const)
	return {
		get models() {
			return models
		},
		get customModels() {
			return customModels
		},
		get available_models() {
			return available_models
		},
		getModels,
	}
}
