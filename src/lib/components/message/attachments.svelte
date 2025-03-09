<script lang="ts">
	import type { Attachment } from 'ai'
	import { ExternalLinkIcon, FileTextIcon } from 'lucide-svelte'
	import { Button } from '../ui/button'

	let { attachments }: { attachments?: Attachment[] } = $props()
</script>

{#if attachments}
	{#each attachments as attachment}
		{#if attachment.contentType?.startsWith('image/')}
			<div
				class="bg-background min-h-16 min-w-16 overflow-hidden rounded-lg border">
				<img
					src={attachment.url}
					alt={attachment.name}
					class="w-full" />
			</div>
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
