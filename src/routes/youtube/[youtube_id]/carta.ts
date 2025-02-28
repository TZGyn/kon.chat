import { type Plugin } from 'carta-md'
import {
	visit,
	type Visitor,
	type VisitorResult,
} from 'unist-util-visit'
import type { Parent, RootContent, Text } from 'mdast'

const transformer = (ast: any) => {
	const visitor: Visitor<Text, Parent> = (
		node: Text,
		index,
		parent,
	): VisitorResult => {
		const { value } = node

		function parseTimestampsAndText(str: string) {
			// const regex = /\[(\d+):(\d{2}):(\d{2})\]\s*([^[]*)/g // Regular expression to match optional hours, minutes, seconds, and text segments
			const regex = /\[(?:(\d+):)?(\d{2}):(\d{2})\]\s*([^[]*)/g
			let matches
			const results = []
			let lastIndex = 0

			while ((matches = regex.exec(str)) !== null) {
				const hours = parseInt(matches[1], 10)
				const minutes = parseInt(matches[2], 10)
				const seconds = parseInt(matches[3], 10)
				const text = matches[4].trim()

				// Extract the text before the timestamp
				const precedingText = str
					.substring(lastIndex, matches.index)
					.trim()

				results.push({
					precedingText: precedingText,
					hours: hours || 0,
					minutes: minutes,
					seconds: seconds,
					text: text,
				})

				lastIndex = matches.index + matches[0].length // Update lastIndex to the end of the current match
			}

			// Handle any remaining text after the last timestamp
			const remainingText = str.substring(lastIndex).trim()
			if (remainingText) {
				results.push({
					precedingText: remainingText,
					hours: null,
					minutes: null,
					seconds: null,
					text: null,
				})
			}

			return results
		}

		const timestampsAndTexts = parseTimestampsAndText(value)

		const children: RootContent[] = timestampsAndTexts.flatMap(
			(data) => {
				const precedingText = data.precedingText

				const result: RootContent[] = []
				if (precedingText) {
					result.push({
						type: 'text',
						value: precedingText,
					} as Text)
				}
				const { hours, minutes, seconds } = data
				if (hours !== null && minutes !== null && seconds !== null) {
					let totalSeconds = 0
					let timestamp = ''
					if (hours) {
						timestamp += `${hours}:`
						totalSeconds += hours * 60 * 60
					}
					totalSeconds += minutes * 60
					totalSeconds += seconds
					timestamp += `${(minutes < 10 ? '0' : '') + minutes}:${
						(seconds < 10 ? '0' : '') + seconds
					}`

					result.push({
						type: 'link',
						url: `${totalSeconds}`,
						children: [{ value: timestamp, type: 'text' }],
						title: timestamp,
						data: {
							hName: 'a',
							hProperties: {
								class:
									'youtube-timestamp bg-secondary py-0 px-1 text-sm no-underline rounded',
							},
						},
						value: timestamp,
					} as RootContent)
				}
				const text = data.text
				if (text) {
					result.push({
						type: 'text',
						value: text,
					} as Text)
				}
				return result
			},
		)
		parent!.children.splice(index!, 1, ...children)

		return
	}

	visit(ast, 'text', visitor)
}

export const youtube: () => Plugin = () => ({
	transformers: [
		{
			type: 'remark',
			execution: 'sync',
			transform: ({ processor }) => {
				processor.use(() => transformer)
			},
		},
	],
})
