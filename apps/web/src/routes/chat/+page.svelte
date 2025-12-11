<script lang="ts">
	import { goto } from "$app/navigation"
	import { nanoid } from "$lib/nanoid"
	import { onMount } from "svelte"

	onMount(()=> {
		goto(`/chat/${nanoid()}?type=new`)
	})
</script>