export const useModels = () => {
	let freeModels = $derived([
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
	] as const)
	let standardModels = $derived([
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
			name: 'DeepSeek R1 (Groq)',
			info: '',
			provider: 'groq',
			id: 'deepseek-r1-distill-llama-70b',
			capabilities: {
				image: false,
				file: false,
				fast: true,
				reasoning: true,
				searchGrounding: false,
			},
		},
		{
			name: 'Llama 3.3 (Groq)',
			info: '',
			provider: 'groq',
			id: 'llama-3.3-70b-versatile',
			capabilities: {
				image: false,
				file: false,
				fast: true,
				reasoning: false,
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
	] as const)

	let premiumModels = $derived([
		{
			name: 'Clause 3.5 Sonnet',
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
			name: 'Clause 3.7 Sonnet',
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
			name: 'Clause 4 Sonnet',
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
		get freeModels() {
			return freeModels
		},
		get standardModels() {
			return standardModels
		},
		get premiumModels() {
			return premiumModels
		},
	}
}
