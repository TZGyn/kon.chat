<script lang="ts">
	import { cn } from '$lib/utils'
	import { MediaQuery } from 'svelte/reactivity'
	import * as Dialog from '$lib/components/ui/dialog/index.js'
	import * as Drawer from '$lib/components/ui/drawer/index.js'
	import { Button } from '$lib/components/ui/button'
	import * as Carousel from '$lib/components/ui/carousel/index.js'
	import * as Card from '$lib/components/ui/card/index.js'
	import {
		ChevronLeftIcon,
		ChevronRightIcon,
		XIcon,
	} from 'lucide-svelte'
	import type { CarouselAPI } from '$lib/components/ui/carousel/context'
	const PREVIEW_IMAGE_COUNT = {
		MOBILE: 4,
		DESKTOP: 5,
	}

	type SearchImage = {
		url: string
		description: string
	}
	interface ImageGridProps {
		images: SearchImage[]
		showAll?: boolean
	}

	let { images, showAll = false }: ImageGridProps = $props()
	let isOpen = $state(false)
	let selectedImage = $state(0)
	let isDesktop = new MediaQuery('min-width: 768px')

	let displayImages = $derived(
		showAll
			? images
			: images.slice(
					0,
					isDesktop
						? PREVIEW_IMAGE_COUNT.DESKTOP
						: PREVIEW_IMAGE_COUNT.MOBILE,
				),
	)
	let hasMore = $derived(
		images.length >
			(isDesktop
				? PREVIEW_IMAGE_COUNT.DESKTOP
				: PREVIEW_IMAGE_COUNT.MOBILE),
	)
	let api = $state<CarouselAPI>()
	const count = $derived(api ? api.scrollSnapList().length : 0)
	let current = $state(0)
	$effect(() => {
		if (api) {
			current = api.selectedScrollSnap() + 1
			api.on('select', () => {
				current = api!.selectedScrollSnap() + 1
			})
		}
	})

	$effect(() => {
		api?.scrollTo(selectedImage, true)
	})
</script>

<div>
	<div
		class={cn(
			'grid gap-2',
			// Mobile layout
			'grid-cols-2',
			displayImages.length === 1 && 'grid-cols-1',
			// Tablet layout
			'sm:grid-cols-3',
			// Desktop layout
			'lg:grid-cols-4',
			// Reduced height with aspect ratio
			'[&>*]:aspect-[4/3]',
			// First image larger on desktop or when it's the only image
			'[&>*:first-child]:col-span-1 [&>*:first-child]:row-span-1',
			isDesktop &&
				displayImages.length > 1 &&
				'[&>*:first-child]:col-span-2 [&>*:first-child]:row-span-2',
			displayImages.length === 1 &&
				'!grid-cols-1 [&>*:first-child]:!col-span-1 [&>*:first-child]:!row-span-2',
		)}>
		{#each displayImages as image, index}
			<button
				class={cn(
					'group/image relative overflow-hidden rounded-xl',
					'transition-all duration-200',
					'bg-primary/5 dark:bg-primary/10 shadow-sm hover:cursor-pointer',
				)}
				onclick={() => {
					isOpen = true
					selectedImage = index
				}}>
				<img
					src={image.url}
					alt={image.description}
					class={cn(
						'h-full w-full object-cover',
						'transition-all duration-500',
						'group-hover/image:scale-105',
						'opacity-0 [&.loaded]:opacity-100',
					)}
					onload={(e) => {
						e.currentTarget.classList.add('loaded')
					}} />
				{#if image.description}
					<div
						class="absolute inset-0 flex items-center justify-center bg-black/60 p-2 opacity-0 transition-opacity duration-200 group-hover/image:opacity-100">
						<p class="line-clamp-3 text-xs text-white">
							{image.description}
						</p>
					</div>
				{/if}
				{#if !showAll && hasMore && index === displayImages.length - 1}
					<div
						class="absolute inset-0 flex items-center justify-center bg-black/60">
						<span class="text-sm font-medium text-white">
							+{images.length - displayImages.length}
						</span>
					</div>
				{/if}
			</button>
		{/each}
	</div>

	{#if isDesktop.current}
		<Dialog.Root bind:open={isOpen}>
			<Dialog.Content class="">
				<Dialog.Header>
					<Dialog.Title>Images</Dialog.Title>
					<Dialog.Description>
						{current} of {images.length}
					</Dialog.Description>
				</Dialog.Header>
				<Carousel.Root
					class="w-full"
					setApi={(emblaApi) => (api = emblaApi)}>
					<Carousel.Content>
						{#each images as image, i (i)}
							<Carousel.Item>
								<div class="p-1">
									<Card.Root>
										<Card.Content
											class="flex aspect-square items-center justify-center p-6">
											<img
												src={image.url}
												alt={image.description}
												class="h-full w-full object-contain" />
										</Card.Content>
									</Card.Root>
								</div>
							</Carousel.Item>
						{/each}
					</Carousel.Content>
					<Carousel.Previous class="-left-2" />
					<Carousel.Next class="-right-2" />
				</Carousel.Root>
			</Dialog.Content>
		</Dialog.Root>
	{:else}
		<Drawer.Root bind:open={isOpen}>
			<Drawer.Content class="bg-background p-0">
				<Drawer.Header>
					<Drawer.Title>Images</Drawer.Title>
					<Drawer.Description>
						{current} of {images.length}
					</Drawer.Description>
				</Drawer.Header>
				<Carousel.Root
					class="w-full"
					setApi={(emblaApi) => (api = emblaApi)}>
					<Carousel.Content>
						{#each images as image, i (i)}
							<Carousel.Item>
								<div class="p-1">
									<Card.Root>
										<Card.Content
											class="flex aspect-square items-center justify-center p-6">
											<img
												src={image.url}
												alt={image.description}
												class="h-full w-full object-contain" />
										</Card.Content>
									</Card.Root>
								</div>
							</Carousel.Item>
						{/each}
					</Carousel.Content>
					<Carousel.Previous class="left-4" />
					<Carousel.Next class="right-4" />
				</Carousel.Root>
			</Drawer.Content>
		</Drawer.Root>
	{/if}
</div>
