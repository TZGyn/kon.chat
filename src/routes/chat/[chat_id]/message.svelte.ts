import {
	fillMessageParts,
	type ChatMessage,
	type ChatUIMessage,
} from '$lib/message'
import { nanoid } from '$lib/nanoid'
import type { ChatOptions } from '@ai-sdk/svelte'
import {
	callChatApi,
	prepareAttachmentsForRequest,
	type ChatRequest,
	type ChatRequestOptions,
	type JSONValue,
	type Message,
	type UIMessage,
} from '@ai-sdk/ui-utils'

export const getChatState = (options: ChatOptions = {}) => {
	let api = $derived(options.api ?? '/api/chat')

	let id = $derived(options.id ?? nanoid())

	let messages = $state<ChatUIMessage[]>([])
	let abortController: AbortController | null = null
	let status = $state<'submitted' | 'streaming' | 'ready' | 'error'>(
		'ready',
	)
	let input = $state('')
	let data = $state<JSONValue[]>([])

	$effect(() => {
		console.log(input)
	})

	const stop = () => {
		try {
			abortController?.abort()
		} catch {
			// ignore
		} finally {
			status = 'ready'
			abortController = null
		}
	}
	const handleSubmit = async (
		event?: { preventDefault?: () => void },
		options: ChatRequestOptions = {},
	) => {
		event?.preventDefault?.()
		if (!input && !options.allowEmptySubmit) return

		const attachmentsForRequest = await prepareAttachmentsForRequest(
			options.experimental_attachments,
		)

		const newMessages = messages.concat({
			id: nanoid(),
			createdAt: new Date(),
			role: 'user',
			content: input,
			experimental_attachments:
				attachmentsForRequest.length > 0
					? attachmentsForRequest
					: undefined,
			parts: [{ type: 'text', text: input }],
			status: 'ready',
		})

		const chatRequest: Omit<ChatRequest, 'messages'> & {
			messages: ChatMessage[]
		} = {
			messages: newMessages,
			headers: options.headers,
			body: options.body,
			data: options.data,
		}

		const request = triggerRequest(chatRequest)
		input = ''
		await request
	}

	const triggerRequest = async (chatRequest: ChatRequest) => {
		const new_messages = fillMessageParts(
			chatRequest.messages as ChatMessage[],
		)
		try {
			abortController = new AbortController()

			// Optimistically update messages
			messages = new_messages

			const constructedMessagesPayload = messages.map(
				({
					role,
					content,
					experimental_attachments,
					data,
					annotations,
					toolInvocations,
					parts,
				}) => ({
					role,
					content,
					...(experimental_attachments !== undefined && {
						experimental_attachments,
					}),
					...(data !== undefined && { data }),
					...(annotations !== undefined && { annotations }),
					...(toolInvocations !== undefined && { toolInvocations }),
					...(parts !== undefined && { parts }),
				}),
			)

			const existingData = data ?? []

			messages.push({
				id: nanoid(),
				role: 'assistant',
				content: '',
				parts: [],
				status: 'submitted',
			})

			await callChatApi({
				api: api,
				body: {
					id: id,
					messages: constructedMessagesPayload,
					data: chatRequest.data,
					...chatRequest.body,
				},
				streamProtocol: 'data',
				credentials: 'include',
				headers: {
					...chatRequest.headers,
				},
				abortController: () => abortController,
				restoreMessagesOnFailure: () => {},
				onResponse: () => {},
				onUpdate: ({ message, data, replaceLastMessage }) => {
					status = 'streaming'

					messages = messages

					messages[messages.length - 1] = {
						...message,
						status: 'streaming',
					}

					if (data?.length) {
						data = existingData
						data.push(...data)
					}
				},
				onToolCall: () => {},
				onFinish: (message, option) => {
					options.onFinish?.(message, option)
					messages[messages.length - 1].status = 'ready'
				},
				generateId: nanoid,
				fetch: options.fetch,
				// callChatApi calls structuredClone on the message
				lastMessage: $state.snapshot(messages[messages.length - 1]),
			})

			abortController = null
			status = 'ready'
		} catch (error) {
			// if (isAbortError(error)) {
			// 	return
			// }
			// const coalescedError =
			// 	error instanceof Error ? error : new Error(String(error))
			// if (this.#options.onError) {
			// 	this.#options.onError(coalescedError)
			// }
			// this.#store.status = 'error'
			// this.#store.error = coalescedError
		}
	}

	return {
		get messages(): ChatUIMessage[] {
			return messages
		},
		set messages(value: ChatMessage[]) {
			messages = fillMessageParts(value)
		},
		stop,
		handleSubmit,
		get status() {
			return status
		},
		get input() {
			return input
		},
		set input(value: string) {
			input = value
		},
		data,
		get id() {
			return id
		},
	}
}
