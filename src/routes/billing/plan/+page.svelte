<script lang="ts">
	import * as Tooltip from '$lib/components/ui/tooltip/index.js'
	import { InfoIcon } from 'lucide-svelte'
	import { ScrollArea } from '$lib/components/ui/scroll-area'
	import { PUBLIC_API_URL } from '$env/static/public'
	import { Button } from '$lib/components/ui/button'
</script>

<ScrollArea class="flex flex-1 p-4">
	<div class="flex w-full flex-wrap justify-center gap-8">
		{@render PricingCard({
			name: 'Basic',
			description: 'Monthly Subscription',
			price: '5',
			per: 'month',
			link: PUBLIC_API_URL + '/billing/plan/basic',
			included: [
				{
					title: 'Access to all standard models',
				},
				{
					title: 'Access to Web Search and Image upload',
				},
				{
					title: '1000 Standard Chats/month',
				},
				{
					title: '100 Web Searches/month',
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
					title: 'Access to all standard and premium models',
				},
				{
					title: 'Access to Web Search and Image upload',
				},
				{
					title:
						'Access to all upcoming features (youtube/pdf summarizer, deep researcher, etc)',
				},
				{
					title: '3000 Standard Chats/month',
				},
				{
					title: '200 Premium Chats/month',
				},
				{
					title: '400 Web Searches/month',
				},
			],
			notIncluded: [],
		})}
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
