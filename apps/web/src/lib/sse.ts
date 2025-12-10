const JSON_INIT = ['{', '[']

function trim(str: string) {
	return str.trim()
}

export function parseSSE(
	sseObject: string,
	deserializer?: (payload: any) => any,
): {
	data: any
	event: string
	id: string
} | null {
	// Sanitize the input
	if (!sseObject) return null
	if (typeof sseObject !== 'string')
		throw new TypeError(
			'sseObject should be a string ending with \\n\\n',
		)
	if (!sseObject.endsWith('\n\n'))
		throw new TypeError(
			'sseObject should be a string ending with \\n\\n',
		)

	const attributes = sseObject.slice(0, -2).split('\n')
	const payload: any = attributes.reduce((output: any, item) => {
		const tmp = item.split(':')
		const key = tmp[0].trim()
		const value = tmp.slice(1).map(trim).join(':')

		if (key === '') return output
		if (output[key]) output[key] += `\n${value}`
		else output[key] = value
		return output
	}, {})

	if (!payload.data) return payload

	if (deserializer) payload.data = deserializer(payload.data)
	else if (JSON_INIT.includes(payload.data[0]))
		payload.data = JSON.parse(payload.data)
	return payload
}
