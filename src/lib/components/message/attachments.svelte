<script lang="ts">
	import type { Attachment } from 'ai'
	import {
		ExternalLinkIcon,
		FileTextIcon,
		ImageIcon,
	} from 'lucide-svelte'
	import { Button, buttonVariants } from '$lib/components/ui/button'
	import * as Dialog from '$lib/components/ui/dialog'
	import { cn } from '$lib/utils'

	let { attachments }: { attachments?: Attachment[] } = $props()
</script>

{#if attachments}
	{#each attachments as attachment}
		{#if attachment.contentType?.startsWith('image/')}
			<Dialog.Root>
				<Dialog.Trigger
					class={cn(buttonVariants({ variant: 'outline' }))}>
					<ImageIcon />
					<span>{decodeURIComponent(attachment.name!)}</span>
				</Dialog.Trigger>
				<Dialog.Content>
					<div
						class="bg-background min-h-16 min-w-16 overflow-hidden rounded-lg">
						<img
							src={attachment.url}
							alt={attachment.name}
							class="w-full" />
					</div>
				</Dialog.Content>
			</Dialog.Root>
		{/if}
		{#if attachment.contentType === 'application/pdf'}
			<Button variant="outline" href={attachment.url} target="_blank">
				<FileTextIcon />
				<span>{decodeURIComponent(attachment.name!)}</span>
				<ExternalLinkIcon class="text-muted-foreground" />
			</Button>
		{/if}
	{/each}
{/if}
