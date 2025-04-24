<script lang="ts">
	import * as Tooltip from '$lib/components/ui/tooltip/index.js'
	import {
		BookIcon,
		GlobeIcon,
		ImagesIcon,
		InfoIcon,
		LibraryBigIcon,
		MessageCircleIcon,
	} from 'lucide-svelte'
	import { ScrollArea } from '$lib/components/ui/scroll-area'
	import { PUBLIC_API_URL } from '$env/static/public'
	import { Button } from '$lib/components/ui/button'
	import * as Table from '$lib/components/ui/table/index.js'
	import XaiIcon from '$lib/icons/xai-icon.svelte'
	import AnthropicIcon from '$lib/icons/anthropic-icon.svelte'
	import GroqIcon from '$lib/icons/groq-icon.svelte'
	import OpenaiIcon from '$lib/icons/openai-icon.svelte'
	import GoogleIcon from '$lib/icons/google-icon.svelte'
	import TwitterLogo from '$lib/components/icons/twitter-logo.svelte'

	const models = [
		{
			name: 'Gemini 2.0 Flash',
			provider: 'google',
			cost: 0,
		},
		{
			name: 'GPT 4o mini',
			provider: 'openai',
			cost: 40,
		},
		{
			name: 'GPT 4o',
			provider: 'openai',
			cost: 100,
		},
		{
			name: 'o3 mini',
			provider: 'openai',
			cost: 40,
		},
		{
			name: 'Grok 2',
			provider: 'xai',
			cost: 40,
		},
		{
			name: 'Grok 2 Vision',
			provider: 'xai',
			cost: 40,
		},
		{
			name: 'DeepSeek R1 (Groq)',
			provider: 'groq',
			cost: 50,
		},
		{
			name: 'Qwen QwQ (Groq)',
			provider: 'groq',
			cost: 30,
		},
		{
			name: 'Llama 3.3 (Groq)',
			provider: 'groq',
			cost: 30,
		},
		{
			name: 'Clause 3.5 Sonnet',
			provider: 'anthropic',
			cost: 500,
		},
		{
			name: 'Clause 3.7 Sonnet',
			provider: 'anthropic',
			cost: 500,
		},
	] as const

	const tools = [
		{
			name: 'Web',
			description: 'Search the web',
			icon: GlobeIcon,
			cost: 200,
		},
		{
			name: 'X',
			description: 'Search X posts',
			icon: TwitterLogo,
			cost: 200,
		},
		{
			name: 'Academic',
			description: 'Search academic papers (PDF)',
			icon: BookIcon,
			cost: 200,
		},
		{
			name: 'Web Reader',
			description: 'Read articles from the web',
			icon: LibraryBigIcon,
			cost: 200,
		},
		{
			name: 'Image',
			description:
				"Generate Image using OpenAI's latest image-gen technology",
			icon: ImagesIcon,
			cost: 1200,
		},
	] as const
</script>

<ScrollArea class="max-h-svh flex-1 p-4">
	<div class="flex w-full items-center justify-center pt-[10vh]">
		<div class="flex flex-wrap justify-center gap-8">
			{@render PricingCard({
				name: 'Basic',
				description: 'Monthly Subscription',
				price: '5',
				per: 'month',
				link: PUBLIC_API_URL + '/billing/plan/basic',
				included: [
					{
						title: '500 Credits/month',
					},
					{
						title: 'Access to Web Search and Image/File upload',
					},
					{
						title: 'Access to Image Generation Tools',
					},
				],
				notIncluded: [],
			})}
			{@render PricingCard({
				name: 'Pro',
				description: 'Monthly Subscription',
				price: '15',
				per: 'month',
				link: PUBLIC_API_URL + '/billing/plan/pro',
				included: [
					{
						title: 'Everything in Basic',
					},
					{
						title: '1500 Credits/month',
					},
					{
						title: 'Higher upload limits',
					},
				],
				notIncluded: [],
			})}
		</div>
	</div>
	<div class="flex flex-col items-center gap-20 pt-20">
		<h1 class="text-3xl font-bold">Pricing Table</h1>

		<div class="w-full max-w-xl">
			<Table.Root>
				<Table.Caption>Model pricings.</Table.Caption>
				<Table.Header>
					<Table.Row>
						<Table.Head class="w-full">Model</Table.Head>
						<Table.Head class="text-right text-nowrap">
							Cost (credit)
						</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each models as model}
						<Table.Row>
							<Table.Cell class="font-medium">
								<div class="flex items-center gap-2">
									<div class="[&_svg]:size-4">
										{@render modelIcon(model.provider)}
									</div>
									<div class="flex flex-col items-start gap-1">
										<span>
											{model.name}
										</span>
									</div>
								</div>
							</Table.Cell>
							<Table.Cell class="text-center">
								{model.cost / 100}
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
		<div class="w-full max-w-xl">
			<Table.Root>
				<Table.Caption>Tool pricings.</Table.Caption>
				<Table.Header>
					<Table.Row>
						<Table.Head class="w-full">Tool</Table.Head>
						<Table.Head class="text-right text-nowrap">
							Cost (credit)
						</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each tools as tool}
						<Table.Row>
							<Table.Cell class="font-medium">
								<div class="flex items-center gap-2">
									<div class="[&_svg]:size-4">
										<tool.icon />
									</div>
									<span>
										{tool.name}
									</span>
									<Tooltip.Provider>
										<Tooltip.Root>
											<Tooltip.Trigger>
												<InfoIcon class="text-muted-foreground h-4" />
											</Tooltip.Trigger>
											<Tooltip.Content>
												<p>{tool.description}</p>
											</Tooltip.Content>
										</Tooltip.Root>
									</Tooltip.Provider>
								</div>
							</Table.Cell>
							<Table.Cell class="text-center">
								{tool.cost / 100}
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	</div>
</ScrollArea>

{#snippet PricingCard({
	name,
	description,
	price,
	per,
	included,
	notIncluded,
	link,
}: {
	name: string
	description: string
	price: string
	per: string
	included: {
		title: string
		moreInfo?: string[]
		comingSoon?: boolean
	}[]
	notIncluded: string[]
	link: string
})}
	<div
		class="bg-secondary w-[400px] divide-y rounded-2xl border shadow-sm">
		<div class="flex flex-col items-start gap-4 p-6 sm:px-8">
			<h2 class="text-primary text-lg font-medium">
				{name}
				<span class="sr-only">Plan</span>
			</h2>

			<p class="text-muted-foreground">
				{description}
			</p>

			<p>
				<strong class="text-3xl font-bold sm:text-4xl">
					${price}
				</strong>

				<span class="text-sm font-medium">/{per}</span>
			</p>

			<Button href={link} class="w-full">Get Started</Button>
		</div>

		<div class="p-6 sm:px-8">
			<p
				class="text-primary text-start text-lg font-medium sm:text-xl">
				What's included:
			</p>

			<ul class="mt-2 space-y-2 sm:mt-4">
				{#each included as item}
					<li class="flex items-center gap-2">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="text-primary size-5 min-w-5">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M4.5 12.75l6 6 9-13.5" />
						</svg>

						<span>{item.title}</span>

						{#if item.comingSoon}
							<span class="text-muted-foreground">(Coming Soon)</span>
						{/if}

						{#if item.moreInfo}
							<Tooltip.Provider>
								<Tooltip.Root>
									<Tooltip.Trigger>
										<InfoIcon class="text-muted-foreground size-4" />
									</Tooltip.Trigger>
									<Tooltip.Content>
										{#each item.moreInfo as info}
											<p>{info}</p>
										{/each}
									</Tooltip.Content>
								</Tooltip.Root>
							</Tooltip.Provider>
						{/if}
					</li>
				{/each}
				{#each notIncluded as item}
					<li class="flex items-center gap-1">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="size-5 text-red-700">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M6 18L18 6M6 6l12 12" />
						</svg>

						<span>{item}</span>
					</li>
				{/each}
			</ul>
		</div>
	</div>
{/snippet}

{#snippet modelIcon(provider: string)}
	{#if provider === 'google'}
		<GoogleIcon />
	{:else if provider === 'openai'}
		<OpenaiIcon />
	{:else if provider === 'groq'}
		<GroqIcon />
	{:else if provider === 'anthropic'}
		<AnthropicIcon />
	{:else if provider === 'xai'}
		<XaiIcon />
	{/if}
{/snippet}
