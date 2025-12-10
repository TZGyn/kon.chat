import { redis } from '$api/redis'
import {
	formatDataStreamPart,
	type TextStreamPart,
	type ToolSet,
} from 'ai'

function getErrorMessage(error: unknown | undefined) {
	if (error == null) {
		return 'unknown error'
	}

	if (typeof error === 'string') {
		return error
	}

	if (error instanceof Error) {
		return error.message
	}

	return JSON.stringify(error)
}

const arrToObj = (arr: string[]) => {
	const obj: Record<string, string> = {}

	for (let i = 0; i < arr.length; i += 2) {
		obj[arr[i]] = JSON.parse(arr[i + 1])
	}

	return obj
}

export const resumeStream = async ({
	controller,
	groupName,
	streamKey,
}: {
	groupName: string
	streamKey: string
	controller: ReadableStreamDefaultController
}) => {
	const chunks = (await redis.xreadgroup(
		'GROUP',
		groupName,
		'consumer-1',
		'STREAMS',
		streamKey,
		'>',
	)) as any[]

	if (chunks?.length > 0) {
		const [_streamKey, messages] = chunks[0]
		for (const [_messageId, fields] of messages) {
			const chunk = arrToObj(fields) as TextStreamPart<ToolSet>

			const chunkType = chunk.type
			// @ts-ignore
			if (chunkType == 'message_annotations') {
				controller.enqueue(
					formatDataStreamPart(
						'message_annotations',
						// @ts-ignore
						[chunk.annotation],
					),
				)
			} else if (chunkType == 'text-delta') {
				controller.enqueue(
					formatDataStreamPart('text', chunk.textDelta),
				)
			} else if (chunkType == 'reasoning') {
				controller.enqueue(
					formatDataStreamPart('reasoning', chunk.textDelta),
				)
			} else if (chunkType == 'redacted-reasoning') {
				controller.enqueue(
					formatDataStreamPart('redacted_reasoning', {
						data: chunk.data,
					}),
				)
			} else if (chunkType == 'reasoning-signature') {
				controller.enqueue(
					formatDataStreamPart('reasoning_signature', {
						signature: chunk.signature,
					}),
				)
			} else if (chunkType == 'file') {
				controller.enqueue(
					formatDataStreamPart('file', {
						mimeType: chunk.mimeType,
						data: chunk.base64,
					}),
				)
			} else if (chunkType == 'source') {
				controller.enqueue(
					formatDataStreamPart('source', chunk.source),
				)
			} else if (chunkType == 'tool-call-streaming-start') {
				controller.enqueue(
					formatDataStreamPart('tool_call_streaming_start', {
						toolCallId: chunk.toolCallId,
						toolName: chunk.toolName,
					}),
				)
			} else if (chunkType == 'tool-call-delta') {
				controller.enqueue(
					formatDataStreamPart('tool_call_delta', {
						toolCallId: chunk.toolCallId,
						argsTextDelta: chunk.argsTextDelta,
					}),
				)
			} else if (chunkType == 'tool-call') {
				controller.enqueue(
					formatDataStreamPart('tool_call', {
						toolCallId: chunk.toolCallId,
						toolName: chunk.toolName,
						args: chunk.args,
					}),
				)
			}
			// @ts-ignore
			else if (chunkType == 'tool-result') {
				controller.enqueue(
					formatDataStreamPart('tool_result', {
						// @ts-ignore
						toolCallId: chunk.toolCallId,
						// @ts-ignore
						result: chunk.result,
					}),
				)
			} else if (chunkType == 'error') {
				controller.enqueue(
					formatDataStreamPart('error', chunk.error as string),
				)
			} else if (chunkType == 'step-start') {
				controller.enqueue(
					formatDataStreamPart('start_step', {
						messageId: chunk.messageId,
					}),
				)
			} else if (chunkType == 'step-finish') {
				controller.enqueue(
					formatDataStreamPart('finish_step', {
						finishReason: chunk.finishReason,
						usage: {
							promptTokens: chunk.usage.promptTokens,
							completionTokens: chunk.usage.completionTokens,
						},
						isContinued: chunk.isContinued,
					}),
				)
			} else if (chunkType == 'finish') {
				controller.enqueue(
					formatDataStreamPart('finish_message', {
						finishReason: chunk.finishReason,
						usage: {
							promptTokens: chunk.usage.promptTokens,
							completionTokens: chunk.usage.completionTokens,
						},
					}),
				)
			} else {
				const exhaustiveCheck: never = chunkType
				throw new Error(`Unknown chunk type: ${exhaustiveCheck}`)
			}
		}
	}
}
