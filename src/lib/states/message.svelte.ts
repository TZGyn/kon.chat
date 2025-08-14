import { makeClient } from '$api/api-client'
import { PUBLIC_API_URL } from '$env/static/public'
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
} from '@ai-sdk/ui-utils'
import { useChats } from './chats.svelte'

export type ChatState = {
	get messages(): ChatUIMessage[]
	set messages(value: ChatMessage[])
	handleSubmit: (
		event?: {
			preventDefault?: () => void
		},
		options?: ChatRequestOptions,
	) => Promise<void>
	get status(): 'submitted' | 'streaming' | 'ready' | 'error'
	set status(value: 'submitted' | 'streaming' | 'ready' | 'error')
	get input(): string
	set input(value: string)
	get data(): JSONValue[]
	set data(value: JSONValue)
	get id(): string
	getMessage: ({
		index,
		type,
		chatRequest,
		streamId,
	}: {
		type: 'resume' | 'new'
		index: number
		chatRequest: {
			data?: JSONValue | undefined
			body?: object | undefined
			headers?: Record<string, string> | Headers | undefined
			messages?: ChatMessage[]
		}
		streamId?: string
	}) => Promise<void>
	set chatId(value: string)
	get ignoreStreams(): string[]
	get suggestions(): string[]
}

export type ChatStateInput = {
	options: ChatOptions
	chatId: string
}

let messages = $state<ChatUIMessage[]>([])
let suggestions = $state<string[]>([])
let ignoreStreams = $state<string[]>([])

export const getChatState = ({
	options,
	chatId: chat_id,
}: ChatStateInput) => {
	let chats = useChats()

	let api = $derived(`${PUBLIC_API_URL}/chat/${chat_id}`)

	let id = $derived(nanoid())

	let chatId = $derived(chat_id)

	let status = $state<'submitted' | 'streaming' | 'ready' | 'error'>(
		'ready',
	)
	let input = $state('')
	let data = $state<JSONValue[]>([])

	const client = makeClient(fetch)

	const checkActiveStreams = async (chat_id: string) => {
		const response = await makeClient(fetch).chat[
			':chat_id'
		].active_streams.$get({
			param: {
				chat_id: chat_id,
			},
		})

		if (response.status === 200) {
			const activeStreams = await response.json()

			activeStreams.activeStreams.map(async (stream) => {
				messages.push(stream.message as ChatUIMessage)
				const newMessages = $state.snapshot(messages)
				await getMessage({
					index: newMessages.length - 1,
					type: 'resume',
					chatRequest: {
						body: {
							id: stream.id,
						},
					},
					streamId: stream.id,
				})
			})
		}
	}

	$effect(() => {
		checkActiveStreams(chatId)
	})

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

		const request = getMessage({
			index: newMessages.length - 1,
			type: 'new',
			chatRequest,
		})
		input = ''
		await request
	}

	const getMessage = async ({
		index,
		type,
		chatRequest,
		streamId,
	}: {
		type: 'resume' | 'new'
		index: number
		chatRequest: {
			data?: JSONValue | undefined
			body?: object | undefined
			headers?: Record<string, string> | Headers | undefined
			messages?: ChatMessage[]
		}
		streamId?: string
	}) => {
		if (chatRequest.messages) {
			const new_messages = fillMessageParts(
				chatRequest.messages as ChatMessage[],
			)

			// Optimistically update messages
			messages = new_messages
		}

		chats.updateChatStatus({
			id: id,
			status: 'streaming',
		})

		try {
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

			if (type !== 'new') {
				messages.push({
					id: nanoid(),
					role: 'assistant',
					content: '',
					parts: [{ type: 'text', text: '' }],
					status: 'submitted',
					chatId: chatId,
					streamId: streamId,
				})

				await callChatApi({
					api: api + '/resume',
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
					abortController: undefined,
					restoreMessagesOnFailure: () => {},
					onResponse: () => {},
					onUpdate: ({ message, data, replaceLastMessage }) => {
						messages = messages

						messages[index + 1] = {
							...messages[index + 1],
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
						messages[index + 1].status = 'ready'
						generateSuggestions([
							messages[index],
							messages[index + 1],
						])
					},
					generateId: nanoid,
					fetch: undefined,
					// callChatApi calls structuredClone on the message
					lastMessage: $state.snapshot(messages[index]),
				})
			} else {
				const response = await client.chat[':chat_id'].$post({
					param: {
						chat_id: chatId,
					},
					json: {
						messages: constructedMessagesPayload,
						...chatRequest.body,
					},
				})

				if (response.status === 200) {
					const streamId = (await response.json()).messageId
					ignoreStreams.push(streamId)
					getMessage({
						type: 'resume',
						chatRequest: {
							body: {
								id: streamId,
							},
						},
						index,
						streamId: streamId,
					})
				}
			}
		} catch (error) {
			console.log(isAbortError(error))
			if (isAbortError(error)) {
				return
			}
			const coalescedError =
				error instanceof Error ? error : new Error(String(error))

			status = 'ready'
			messages[messages.length - 1].annotations?.push({
				type: 'kon_chat',
				status: 'error',
				error: {
					type: coalescedError.name,
					message: coalescedError.message,
				},
			})
			messages[index + 1].status = 'ready'
			// this.#store.error = coalescedError
		} finally {
			chats.updateChatStatus({
				id: id,
				status: 'ready',
			})
		}
	}

	const generateSuggestions = async (messages: ChatUIMessage[]) => {
		const response = await client.chat.suggestions.$post({
			json: {
				messages: messages,
			},
		})

		if (response.status === 200) {
			const data = await response.json()

			suggestions = data.suggestions
		}
	}

	return {
		get messages(): ChatUIMessage[] {
			return messages
		},
		set messages(value: ChatMessage[]) {
			messages = fillMessageParts(value)
		},
		handleSubmit,
		get status() {
			return status
		},
		set status(value) {
			status = value as any
		},
		get input() {
			return input
		},
		set input(value: string) {
			input = value
		},
		get data() {
			return data
		},
		set data(value: JSONValue[]) {
			data = value
		},
		get id() {
			return id
		},
		getMessage,
		set chatId(value: string) {
			chatId = value
		},
		get ignoreStreams() {
			return ignoreStreams
		},
		get suggestions() {
			return suggestions
		},
	}
}

function isAbortError(error: unknown): error is Error {
	return (
		error instanceof Error &&
		(error.name === 'AbortError' || error.name === 'TimeoutError')
	)
}
