<script lang="ts">
	import * as Card from '$lib/components/ui/card'
	import * as Avatar from '$lib/components/ui/avatar/index.js'
	import { Separator } from '$lib/components/ui/separator'
	import { type EnrichedTweet, enrichTweet } from 'react-tweet'

	let { tweet_id }: { tweet_id: string } = $props()
	let tweet = $state<Promise<EnrichedTweet>>(
		fetch(`https://react-tweet.vercel.app/api/tweet/${tweet_id}`)
			.then((data) => data.json())
			.then((data) => {
				console.log(data.data)
				return enrichTweet(data.data)
			}) as Promise<EnrichedTweet>,
	)
	export const formatNumber = (n: number): string => {
		if (n > 999999) return `${(n / 1000000).toFixed(1)}M`
		if (n > 999) return `${(n / 1000).toFixed(1)}K`
		return n.toString()
	}
</script>

{#await tweet then tweet}
	<a href={tweet.url} target="_blank" class="flex">
		<Card.Root class="flex max-w-[500px] flex-col">
			<Card.Header class="flex flex-row items-center gap-4">
				<Avatar.Root>
					<Avatar.Image
						src={tweet.user.profile_image_url_https}
						alt={tweet.user.name} />
					<Avatar.Fallback>K</Avatar.Fallback>
				</Avatar.Root>
				<div>
					<Card.Title>{tweet.user.name}</Card.Title>
					<Card.Description>
						<a
							href={tweet.user.url}
							class="hover:underline"
							target="_blank">
							@{tweet.user.screen_name}
						</a>
					</Card.Description>
				</div>
			</Card.Header>
			<Card.Content class="h-full">
				{#if tweet.in_reply_to_status_id_str}
					<span class="text-muted-foreground text-sm">
						Replying to @{tweet.in_reply_to_screen_name}
					</span>
				{/if}
				<p lang={tweet.lang} dir="auto">
					{#each tweet.entities as item}
						{#if item.type !== 'media'}
							{#if item.type === 'symbol'}
								<a
									href={item.href}
									target="_blank"
									rel="noopener noreferrer nofollow">
									{item.text}
								</a>
							{:else if ['hashtag', 'mention', 'url'].includes(item.type)}{:else}
								<span class="line-clamp-3 text-wrap">
									bruh
									{@html item.text}
								</span>
							{/if}
						{/if}
					{/each}
				</p>
				{#each tweet.mediaDetails ?? [] as mediaDetails}{/each}
			</Card.Content>
			<Separator />
			<Card.Footer class="p-4">
				<div class="flex items-center gap-4">
					<a
						href={tweet.like_url}
						aria-label="like"
						target="_blank"
						class="flex items-center gap-2">
						<div class="flex justify-center">
							<svg
								viewBox="0 0 24 24"
								class="size-6 fill-red-500 transition-[fill]"
								aria-hidden="true">
								<g>
									<path
										d="M20.884 13.19c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z">
									</path>
								</g>
							</svg>
						</div>
						<span class="">
							{formatNumber(tweet.favorite_count)}
						</span>
					</a>
					<a
						href={tweet.reply_url}
						aria-label="reply"
						target="_blank"
						class="group/reply flex items-center gap-2">
						<div class="flex justify-center">
							<svg
								viewBox="0 0 24 24"
								class="fill-background stroke-muted-foreground group-hover/reply:fill-accent size-6 stroke-1 transition-[fill]"
								aria-hidden="true">
								<g>
									<path
										d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01z">
									</path>
								</g>
							</svg>
						</div>
						<span>Reply</span>
					</a>
				</div>
			</Card.Footer>
		</Card.Root>
	</a>
{/await}
