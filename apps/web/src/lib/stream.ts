export const processStream = async ({
	stream,
	onValue,
}: {
	stream: ReadableStream
	onValue: ({ value }: { value: string }) => Promise<void> | void
}) => {
	const reader = stream.getReader()
	const textDecoder = new TextDecoder()

	async function read() {
		const { done, value } = await reader.read()

		if (done) {
			console.log('stream done')
			return
		}

		await onValue({
			value: textDecoder.decode(value, { stream: false }),
		})

		return read()
	}

	return read()
}
