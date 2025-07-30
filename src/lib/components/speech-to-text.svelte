<script lang="ts">
	// https://dev.to/karkranikhil/voice-controlled-notes-taking-application-using-svelte-1kek

	import { Button } from '$lib/components/ui/button'
	import { ConstructionIcon, MicIcon } from 'lucide-svelte'
	import { onMount } from 'svelte'
	import { Toggle } from '$lib/components/ui/toggle'
	import { toast } from 'svelte-sonner'

	let { input = $bindable() }: { input: string } = $props()

	let speechRecognition = $state<SpeechRecognition>()
	let toggleSpeech = $state(false)
	let toggleButton = $state<HTMLElement | null>(null)

	$effect(() => {
		if (toggleSpeech) {
			speechRecognition?.start()
		}
		if (toggleSpeech === false) {
			speechRecognition?.stop()
		}
	})

	onMount(() => {
		try {
			let SpeechRecognition =
				window.SpeechRecognition || window.webkitSpeechRecognition
			speechRecognition = new SpeechRecognition()
		} catch (e) {
			console.error(e)
			toggleButton?.remove()
			return
		}
		//recognition.continuous - If false, the recording will stop after a few seconds of silence.
		// When true, the silence period is longer (about 15 seconds)
		speechRecognition.continuous = true

		// onresult called every time the Speech API captures Voice.
		speechRecognition.onresult = function (event) {
			console.log(event)
			let current = event.resultIndex

			// Get a transcript of what was said.
			let transcript = event.results[current][0].transcript
			console.log(transcript)
			input += transcript
		}

		// Trigger on start
		speechRecognition.onstart = function () {
			// setting the text to inform user about the action
			input = ''
		}
		// Trigger on end
		speechRecognition.onspeechend = function () {
			// speechRecognition?.stop()
			// setting the text to inform user about the action
		}
		speechRecognition.onend = (event) => {
			console.log(event)
			toggleSpeech = false
		}
		// Trigger on error
		speechRecognition.onerror = function (event) {
			console.log(event.error)
			if (event.error === 'network') {
				toast.error(
					'Unexpected network issue using voice, potential solution is disabling adblock for this app',
				)
			}
			if (event.error == 'no-speech') {
				// setting the text to inform user about the action
			}
			toggleSpeech = false
		}
	})
	function readOutLoud(
		message: string = 'what is the latest news on trump',
	) {
		let speech = new SpeechSynthesisUtterance()
		speech.text = message
		speech.volume = 1
		speech.rate = 1
		speech.pitch = 1
		window.speechSynthesis.speak(speech)
	}
</script>

<Toggle
	bind:ref={toggleButton}
	aria-label="toggle grounding"
	bind:pressed={toggleSpeech}>
	<MicIcon />
</Toggle>
