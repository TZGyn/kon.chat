import { useUser } from '../routes/state.svelte'

const userState = useUser()
let plan = $derived(userState.user?.plan)

export const useModels = () => {
	let standardModels = $derived([
		{
			name: 'Gemini 2.0 Flash',
			info: '',
			provider: 'google',
			id: 'gemini-2.0-flash-001',
			capabilities: {
				image: true,
				fast: false,
				reasoning: false,
				searchGrounding: true,
			},
			disabled: false,
		},
		{
			name: 'GPT 4o mini',
			info: '',
			provider: 'openai',
			id: 'gpt-4o-mini',
			capabilities: {
				image: true,
				fast: false,
				reasoning: false,
				searchGrounding: false,
			},
			disabled: plan === undefined || plan === 'free',
		},
		{
			name: 'Grok 2',
			info: '',
			provider: 'xai',
			id: 'grok-2-1212',
			capabilities: {
				image: false,
				fast: false,
				reasoning: false,
				searchGrounding: false,
			},
			disabled: plan === undefined || plan === 'free',
		},
		{
			name: 'Grok 2 Vision',
			info: '',
			provider: 'xai',
			id: 'grok-2-vision-1212',
			capabilities: {
				image: true,
				fast: false,
				reasoning: false,
				searchGrounding: false,
			},
			disabled: plan === undefined || plan === 'free',
		},
		// {
		// 	name: 'GPT 4o',
		// 	info: '',
		// 	provider: 'openai',
		// 	id: 'gpt-4o',
		// 	capabilities: {
		// 		image: true,
		// 		fast: false,
		// 		reasoning: false,
		// 		searchGrounding: false,
		// 	},
		// 	disabled: plan === undefined || plan === 'free',
		// },
		// {
		// 	name: 'o3 mini',
		// 	info: '',
		// 	provider: 'openai',
		// 	id: 'o3-mini',
		// 	capabilities: {
		// 		image: false,
		// 		fast: false,
		// 		reasoning: true,
		// 		searchGrounding: false,
		// 	},
		// 	disabled: plan === undefined || plan === 'free',
		// },
		{
			name: 'DeepSeek R1 (Groq)',
			info: '',
			provider: 'groq',
			id: 'deepseek-r1-distill-llama-70b',
			capabilities: {
				image: false,
				fast: true,
				reasoning: true,
				searchGrounding: false,
			},
			disabled: plan === undefined || plan === 'free',
		},
		{
			name: 'Llama 3.3 (Groq)',
			info: '',
			provider: 'groq',
			id: 'llama-3.3-70b-versatile',
			capabilities: {
				image: false,
				fast: true,
				reasoning: false,
				searchGrounding: false,
			},
			disabled: plan === undefined || plan === 'free',
		},
	] as const)

	let premiumModels = $derived([
		{
			name: 'Clause 3.5 Sonnet',
			info: '',
			provider: 'anthropic',
			id: 'claude-3-5-sonnet-latest',
			capabilities: {
				image: true,
				fast: false,
				reasoning: false,
				searchGrounding: false,
			},
			disabled:
				plan === undefined || plan === 'free' || plan === 'basic',
		},
		{
			name: 'Clause 3.7 Sonnet',
			info: '',
			provider: 'anthropic',
			id: 'claude-3-7-sonnet-20250219',
			capabilities: {
				image: true,
				fast: false,
				reasoning: true,
				searchGrounding: false,
			},
			disabled:
				plan === undefined || plan === 'free' || plan === 'basic',
		},
	] as const)
	$effect(() => {
		console.log(premiumModels)
	})
	return {
		get standardModels() {
			return standardModels
		},
		get premiumModels() {
			return premiumModels
		},
	}
}
