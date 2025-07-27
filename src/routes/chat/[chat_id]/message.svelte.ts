import { makeClient } from '$api/api-client'
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

export const getChatState = ({
	options,
	chatId: chat_id,
}: {
	options: ChatOptions
	chatId: string
}) => {
	let api = $derived(options.api ?? '/api/chat')

	let id = $derived(options.id ?? nanoid())

	let chatId = $derived(chat_id)

	let messages = $state<ChatUIMessage[]>([])
	let abortController: AbortController | null = null
	let status = $state<'submitted' | 'streaming' | 'ready' | 'error'>(
		'ready',
	)
	let input = $state('')
	let data = $state<JSONValue[]>([])

	const stop = () => {
		try {
			console.log('aborted')
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

		try {
			abortController = new AbortController()

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
					parts: [],
					status: 'submitted',
					chatId: chatId,
					streamId: streamId,
				})
			}
			await callChatApi({
				api: type === 'new' ? api : api + '/resume',
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
					if (type === 'new') return
					status = 'streaming'

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
					if (type === 'new') return
					options.onFinish?.(message, option)
					messages[index + 1].status = 'ready'
				},
				generateId: nanoid,
				fetch: options.fetch,
				// callChatApi calls structuredClone on the message
				lastMessage: $state.snapshot(messages[index]),
			})

			abortController = null
			status = 'ready'
		} catch (error) {
			console.log(isAbortError(error))
			if (isAbortError(error)) {
				return
			}
			const coalescedError =
				error instanceof Error ? error : new Error(String(error))
			if (options.onError) {
				options.onError(coalescedError)
			}
			messages[index + 1].status = 'ready'
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
		set status(value) {
			status = value as any
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
		getMessage,
	}
}

function isAbortError(error: unknown): error is Error {
	return (
		error instanceof Error &&
		(error.name === 'AbortError' || error.name === 'TimeoutError')
	)
}
