<script lang="ts">
	import { AspectRatio } from '$lib/components/ui/aspect-ratio'
	import { Button } from '$lib/components/ui/button'
	import { onMount } from 'svelte'
	import * as Tabs from '$lib/components/ui/tabs/index.js'
	import Chat from './(components)/chat.svelte'
	import { page } from '$app/state'
	import { customFetch, customFetchRaw } from '$lib/fetch'
	import {
		parsePartialJson,
		processDataStream,
	} from '@ai-sdk/ui-utils'
	import * as Avatar from '$lib/components/ui/avatar/index.js'
	import { Separator } from '$lib/components/ui/separator'
	import { Carta, Markdown } from 'carta-md'
	import { math } from '@cartamd/plugin-math'
	import { code } from '@cartamd/plugin-code'
	import DOMPurify from 'isomorphic-dompurify'
	import { ScrollArea } from '$lib/components/ui/scroll-area'
	import { goto } from '$app/navigation'
	import { youtube } from './carta'
	import { cn } from '$lib/utils'
	import { Skeleton } from '$lib/components/ui/skeleton'
	import { toast } from 'svelte-sonner'

	let selectedTab = $state(
		page.url.searchParams.get('tab') || 'summary',
	)
	let player = $state<YT.Player>()
	let tabDiv = $state<HTMLDivElement>()

	let status = $state<
		'loading' | 'submitted' | 'streaming' | 'ready'
	>('loading')
	let title = $state('')
	let descriptionHTML = $state<HTMLDivElement>()
	let channelName = $state('')
	let channelUrl = $state('')
	let channelThumbnailUrl = $state('')
	let uploadTime = $state('')
	let summary = $state('')
	let transcript = $state<
		{
			type: 'TranscriptSegment'
			start_ms: string // '240'
			end_ms: string // '5560'
			snippet: {
				runs: {
					text: string
					bold: boolean
					italics: boolean
					strikethrough: boolean
					deemphasize: boolean
				}[]
				// {
				// 	text: 'I secretly interviewed Mr Beast after he refused to answer my questions in my'
				// 	bold: false
				// 	italics: false
				// 	strikethrough: false
				// 	deemphasize: false
				// }
				text: string // 'I secretly interviewed Mr Beast after he refused to answer my questions in my'
			}
			start_time_text: {
				text: string // '0:00'
			}
			target_id: string // 'ADfCseQjh2w.CgNhc3ISAmVuGgA%3D.240.5560'
		}[]
	>([])

	const ytPlayerId = 'youtube-player'

	// https://stackoverflow.com/questions/19700283/how-to-convert-time-in-milliseconds-to-hours-min-sec-format-in-javascript
	function msToTime(duration: number) {
		var milliseconds = Math.floor((duration % 1000) / 100),
			seconds = Math.floor((duration / 1000) % 60),
			minutes = Math.floor((duration / (1000 * 60)) % 60),
			hours = Math.floor((duration / (1000 * 60 * 60)) % 24)

		var result = ''

		if (hours > 0) {
			result += hours + ':'
		}

		return (
			result +
			(minutes < 10 ? '0' : '') +
			minutes +
			':' +
			(seconds < 10 ? '0' : '') +
			seconds
			// +
			// '.' +
			// milliseconds
		)
	}

	const processDescriptionHTML = (html: string) => {
		// https://stackoverflow.com/questions/56300312/remove-a-style-from-an-html-string
		var divElement = document.createElement('div')
		divElement.innerHTML = html

		// loop through ALL DOM elements insidie the divElement
		var elements = divElement.getElementsByTagName('*')
		for (var i = 0; i < elements.length; i++) {
			// elements[i].removeAttribute('style')
			elements[i].innerHTML = elements[i].innerHTML.replace(
				/\&nbsp;/g,
				' ',
			)
			if (elements[i].tagName === 'A') {
				const youtubeId = ((url: string) => {
					// https://codepen.io/catmull/pen/XWQPrQ
					var newval: RegExpMatchArray | null

					if ((newval = url.match(/(\?|&)v=([^&#]+)/))) {
						return newval.pop()
					} else if ((newval = url.match(/(\.be\/)+([^\/]+)/))) {
						return newval.pop()
					} else if ((newval = url.match(/(\embed\/)+([^\/]+)/))) {
						return newval.pop()?.replace('?rel=0', '')
					}

					return undefined
				})(elements[i].getAttribute('href') || '')

				console.log('id from tag', youtubeId, page.params.youtube_id)
				if (youtubeId && youtubeId === page.params.youtube_id) {
					console.log('converting special anchors')

					const url = new URL(elements[i].getAttribute('href')!)

					const t = url.searchParams.get('t')

					console.log(t)

					let seconds
					if (!t) {
						seconds = 0
					} else {
						seconds = parseInt(t)
					}

					elements[i].addEventListener('click', (event) => {
						event.preventDefault()
						if (!player) return
						player.seekTo(seconds, true)
					})
				} else {
					elements[i].setAttribute('target', '_blank')
				}
			}
		}

		descriptionHTML?.appendChild(divElement)
	}

	const getYoutubeData = async () => {
		status = 'loading'
		const response = await customFetchRaw(
			`/youtube/${page.params.youtube_id}`,
		)
		if (!response.ok) {
			toast.error(await response.text())
			return
		}

		if (response.headers.get('Content-Type') === 'application/json') {
			const { youtube: data } = (await response.json()) as {
				youtube: {
					title: string
					description: string
					descriptionHTML: string
					channelName: string
					channelUrl: string
					channelThumbnailUrl: string
					uploadTime: string
					summary: string
					transcript: any
				}
			}

			title = data.title
			channelName = data.channelName
			channelUrl = data.channelUrl
			channelThumbnailUrl = data.channelThumbnailUrl
			summary = data.summary
			uploadTime = data.uploadTime
			transcript = data.transcript
			processDescriptionHTML(data.descriptionHTML)

			status = 'ready'
			return
		}

		status = 'streaming'

		if (!response.body) {
			throw new Error('The response body is empty.')
		}
		await processDataStream({
			stream: response.body,
			onTextPart: (value) => {
				summary += value
			},
			onDataPart: (value) => {
				value.map((value) => {
					// @ts-ignore
					if (value.type === 'youtube_info') {
						// @ts-ignore
						const data = value.info as {
							title: string
							description: string
							descriptionHTML: string
							channelName: string
							channelUrl: string
							channelThumbnailUrl: string
							uploadTime: string
						}

						title = data.title
						channelName = data.channelName
						channelUrl = data.channelUrl
						channelThumbnailUrl = data.channelThumbnailUrl
						uploadTime = data.uploadTime

						processDescriptionHTML(data.descriptionHTML)
					}
					// @ts-ignore
					if (value.type === 'youtube_transcript') {
						// @ts-ignore
						const data = JSON.parse(value.transcript)
						transcript = data
					}
					// @ts-ignore
					if (value.type === 'error') {
						//@ts-ignore
						toast.error(value.message)
						goto('/youtube')
					}
				})
			},
		})

		status = 'ready'
	}

	onMount(() => {
		getYoutubeData()
		function load() {
			player = new YT.Player(ytPlayerId, {
				height: '100%',
				width: '100%',
				videoId: page.params.youtube_id,
				playerVars: { autoplay: 0 },
			})
		}

		if (window.YT) {
			load()
		} else {
			// @ts-ignore
			window.onYouTubeIframeAPIReady = load
		}
		tabDiv?.addEventListener(
			'click',
			(event) => {
				// @ts-ignore
				const target = event.originalTarget as HTMLElement
				const classNames = target.getAttribute('class')
				if (classNames?.startsWith('youtube-timestamp')) {
					event.preventDefault()
					const href = target.getAttribute('href')

					if (!href) return

					const seconds = parseInt(href)
					if (!player) return
					player.seekTo(seconds, true)
				}
			},
			{ capture: true },
		)
	})

	const carta = new Carta({
		sanitizer: DOMPurify.sanitize,
		extensions: [
			// component(mapped, initializeComponents),
			math({ remarkMath: { singleDollarTextMath: false } }),
			code(),
			youtube(),
		],
		theme: 'catppuccin-mocha',
	})
</script>

<svelte:head>
	<script src="https://www.youtube.com/iframe_api"></script>
</svelte:head>
<div
	class="@container flex flex-1 flex-col justify-center overflow-hidden">
	<div class="@6xl:flex-row flex flex-1 flex-col overflow-hidden">
		<div class="flex flex-1 overflow-hidden">
			<div class="@6xl:flex-col flex flex-1 flex-row gap-2">
				<div class="@6xl:flex-0 flex flex-1 flex-col">
					<AspectRatio ratio={16 / 9} class="bg-muted w-full">
						<div id={ytPlayerId}></div>
					</AspectRatio>
					<div
						class="@6xl:border-0 flex h-full flex-col gap-2 border px-4 py-2">
						{#if status === 'loading'}
							<Skeleton class="h-14 w-full rounded" />
						{:else}
							<div class="text-lg font-bold">{title}</div>
						{/if}
						<a href={channelUrl} target="_blank" class="w-fit">
							<div class="flex items-center gap-2">
								{#if status === 'loading'}
									<Skeleton class="size-10 rounded-full" />
								{:else}
									<Avatar.Root>
										<Avatar.Image
											src={channelThumbnailUrl}
											alt="channel" />
										<Avatar.Fallback>
											{channelName[0]}
										</Avatar.Fallback>
									</Avatar.Root>
								{/if}

								<div class="flex flex-col items-start">
									{#if status === 'loading'}
										<Skeleton class="h-14 w-96 rounded" />
									{:else}
										<div>
											{channelName}
										</div>
										<div class="text-muted-foreground">
											{uploadTime}
										</div>
									{/if}
								</div>
							</div>
						</a>
						<Separator />
					</div>
				</div>
				<ScrollArea class="flex flex-1 flex-col items-center">
					<div class="flex flex-1 flex-col gap-4 px-4 py-2">
						<div class="bg-secondary rounded-lg p-2">
							{#if status === 'loading'}
								<Skeleton class="h-96 w-full rounded" />
							{/if}
							<div
								bind:this={descriptionHTML}
								class="**:[a]:inline-flex **:whitespace-normal **:[a>span]:text-sm **:[a]:py-1 **:[a]:px-2 **:[a]:gap-1 **:[a]:items-center **:[a]:bg-background **:[a]:rounded **:[a]:w-fit">
							</div>
						</div>
					</div>
				</ScrollArea>
			</div>
		</div>
		<div bind:this={tabDiv} class="flex flex-1 overflow-hidden">
			<Tabs.Root
				value={selectedTab}
				onValueChange={(value) => {
					selectedTab = value
					page.url.searchParams.set('tab', value)

					goto(`?${page.url.searchParams.toString()}`, {
						keepFocus: true,
					})
				}}
				class="flex flex-1 flex-col border p-4 pb-0">
				<Tabs.List class="w-fit">
					<Tabs.Trigger value="summary">Summary</Tabs.Trigger>
					<Tabs.Trigger value="transcript">Transcript</Tabs.Trigger>
					<Tabs.Trigger value="chat">Chat</Tabs.Trigger>
				</Tabs.List>
				<Tabs.Content
					value="summary"
					class="flex flex-1 overflow-hidden">
					<ScrollArea class="flex flex-1 flex-col items-center">
						<div
							class="prose prose-neutral dark:prose-invert prose-p:my-0 pb-4 pt-2">
							{#key summary}
								<Markdown {carta} value={summary} />
							{/key}
						</div>
						{#if status === 'loading'}
							<div
								class={cn(
									'flex min-h-[calc(100vh-25rem)] gap-2 place-self-start',
								)}>
								<div class="group flex flex-col gap-2">
									<div class="flex items-center gap-4">
										<div
											class="ring-border flex size-8 shrink-0 items-center justify-center rounded-full bg-black ring-1">
											<div class="translate-y-px">
												<Avatar.Root class="size-4 overflow-visible">
													<Avatar.Image
														src={'/logo.png'}
														alt="favicon"
														class="size-4" />
													<Avatar.Fallback
														class="size-4 bg-opacity-0">
														<img src="/logo.png" alt="favicon" />
													</Avatar.Fallback>
												</Avatar.Root>
											</div>
										</div>
										<div class="animate-pulse">Getting Summary</div>
									</div>
								</div>
							</div>
						{/if}
					</ScrollArea>
				</Tabs.Content>
				<Tabs.Content
					value="transcript"
					class="flex flex-1 overflow-hidden">
					<ScrollArea class="flex flex-1 flex-col items-center">
						<div class="flex flex-col gap-2">
							{#if status === 'loading'}
								<Skeleton class="h-16 w-[600px] rounded" />
								<Skeleton class="h-16 w-[600px] rounded" />
								<Skeleton class="h-16 w-[600px] rounded" />
								<Skeleton class="h-16 w-[600px] rounded" />
								<Skeleton class="h-16 w-[600px] rounded" />
								<Skeleton class="h-16 w-[600px] rounded" />
							{/if}
							{#each transcript as transcript}
								<div
									tabindex={1}
									onkeyup={() => {}}
									role="button"
									class="bg-background hover:bg-accent flex cursor-pointer items-start gap-2 rounded px-2 py-1"
									onclick={() => {
										if (!player) return
										player.seekTo(
											Number(transcript.start_ms) / 1000,
											true,
										)
									}}>
									<div
										class="text-muted-foreground w-12 min-w-12 text-end text-sm">
										{msToTime(Number(transcript.start_ms))}
									</div>
									<div>{transcript.snippet.text}</div>
								</div>
							{/each}
						</div>
					</ScrollArea>
				</Tabs.Content>
				<Tabs.Content
					value="chat"
					class="flex flex-1 overflow-hidden">
					<div class="relative flex flex-1 overflow-hidden">
						<Chat
							youtube_id={page.params.youtube_id}
							{transcript}
							{carta} />
					</div>
				</Tabs.Content>
			</Tabs.Root>
		</div>
	</div>
</div>
