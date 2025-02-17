<script lang="ts">
	import type { Attachment, CoreToolMessage } from 'ai'
	import type {
		TextUIPart,
		ReasoningUIPart,
		ToolInvocationUIPart,
	} from '@ai-sdk/ui-utils'
	import type { Message } from '@ai-sdk/svelte'
	import Chat from './(component)/chat.svelte'
	import type { ToolInvocation } from '@ai-sdk/ui-utils'
	import { customFetch } from '$lib/fetch'
	import { useUser } from '../../state.svelte'
	import { type GoogleGenerativeAIProviderMetadata } from '@ai-sdk/google'

	let { data } = $props()

	let isLoading = $state(true)
	let initialMessages = $state<Array<Message>>([])
	let user = $derived(useUser().user)

	function convertToUIMessages(
		messages: Array<{
			model: string | null
			provider: string | null
			id: string
			createdAt: number
			content: unknown
			role: string
			providerMetadata: any
			chatId: string
			braveData: any
		}>,
	): Array<Message> {
		return messages.reduce(
			(chatMessages: Array<Message>, message) => {
				if (message.role === 'tool') {
					return addToolMessageToChat({
						toolMessage: message as CoreToolMessage,

						messages: chatMessages,
					})
				}

				let textContent = ''
				let reasoningContent = ''
				const toolInvocations: Array<ToolInvocation> = []
				const attachments: Array<Attachment> = []

				if (typeof message.content === 'string') {
					textContent = message.content
				} else if (Array.isArray(message.content)) {
					for (const content of message.content) {
						console.log('content', content)
						if (content.type === 'text') {
							textContent += content.text
						} else if (content.type === 'reasoning') {
							reasoningContent += content.reasoning
						} else if (content.type === 'tool-call') {
							toolInvocations.push({
								state: 'call',
								toolCallId: content.toolCallId,
								toolName: content.toolName,
								args: content.args,
							})
						} else if (content.type === 'image') {
							const filename = (content.image as string)
								.split('/')
								.pop()
							if (!filename) continue
							const filetype = filename.split('.').pop()
							if (
								filetype === 'png' ||
								filetype === 'jpg' ||
								filetype === 'jpeg'
							) {
								attachments.push({
									url: content.image,
									contentType: `image/${filetype}`,
									name: filename.substring(
										filename.indexOf('-'),
										filename.length,
									),
								})
							}
						}
					}
				}

				console.log('attachment', attachments)

				chatMessages.push({
					id: message.id,
					role: message.role as Message['role'],
					content: textContent,
					reasoning: reasoningContent,
					toolInvocations,
					annotations: [
						{ type: 'model', model: message.model },
						{
							type: 'search',
							data:
								message.braveData?.web?.results?.map(
									(result: any) => {
										return {
											url: result.url,
											description: result.description,
											title: result.title,
											pageAge: result.page_age,
										}
									},
								) || [],
						},
						message.provider === 'google' && {
							type: 'google-grounding',
							data: message.providerMetadata
								?.google as GoogleGenerativeAIProviderMetadata,
						},
					],
					experimental_attachments: attachments,
				})

				return chatMessages
			},
			[],
		)

		function addToolMessageToChat({
			toolMessage,
			messages,
		}: {
			toolMessage: CoreToolMessage
			messages: Array<Message>
		}): Array<Message> {
			return messages.map((message) => {
				if (message.toolInvocations) {
					return {
						...message,
						toolInvocations: message.toolInvocations.map(
							(toolInvocation) => {
								const toolResult = toolMessage.content.find(
									(tool) =>
										tool.toolCallId === toolInvocation.toolCallId,
								)

								if (toolResult) {
									return {
										...toolInvocation,
										state: 'result',
										result: toolResult.result,
									}
								}

								return toolInvocation
							},
						),
					}
				}

				return message
			})
		}
	}

	const getChat = async () => {
		isLoading = true
		const chat = (
			await customFetch<{
				chat: {
					id: string
					createdAt: number
					userId: string
					title: string
					messages: {
						id: string
						createdAt: number
						chatId: string
						role: string
						content: unknown
						model: string | null
						providerMetadata: any
						braveData: any
						provider: string | null
					}[]
				} | null
			}>(`/chat/${data.chat_id}`)
		).chat

		initialMessages = chat ? convertToUIMessages(chat.messages) : []

		isLoading = false
	}

	$effect(() => {
		console.log(data.chat_id)
		initialMessages = []
		if (!data.isNew) {
			getChat()
		} else {
			isLoading = false
		}
	})
</script>

{#key initialMessages}
	{#if !isLoading}
		<div class="flex flex-1 overflow-hidden">
			<Chat
				chat_id={data.chat_id}
				{initialMessages}
				plan={user?.plan} />
		</div>
	{/if}
{/key}
