<script lang="ts">
	import { Button } from '$lib/components/ui/button'
	import { customFetch } from '$lib/fetch'
	import { useLocalStorage } from '$lib/hooks/use-local-storage.svelte'
	import { RefreshCwIcon } from 'lucide-svelte'
	import { onMount } from 'svelte'

	let isLatest = $state(true)

	let latestDeploymentLocal = useLocalStorage<string>(
		'latest-deployment',
		'',
	)

	let latestDeployment = ''

	const getLatestDeployment = async () => {
		const deployment = await customFetch<{ deployment_id: string }>(
			'/version/app/latest-deployment',
		)

		if (latestDeploymentLocal.value === '') {
			latestDeploymentLocal.value = deployment.deployment_id
			return
		}

		latestDeployment = deployment.deployment_id

		if (latestDeployment !== latestDeploymentLocal.value) {
			isLatest = false
		}
	}

	onMount(() => {
		getLatestDeployment()
	})
</script>

{#if !isLatest}
	<div
		class="bg-secondary absolute bottom-5 right-5 flex items-center gap-2 rounded border px-4 py-2">
		<span class="text-muted-foreground text-sm">
			New version is found, refresh to update
		</span>
		<Button
			onclick={async () => {
				const keys = await caches.keys()
				console.log(keys)

				await Promise.all(
					keys.map(async (key) => await caches.delete(key)),
				)

				location.reload()
				latestDeploymentLocal.value = latestDeployment
			}}
			size="icon"
			variant="ghost">
			<RefreshCwIcon />
		</Button>
	</div>
{/if}
