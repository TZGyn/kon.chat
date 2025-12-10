import type { Message } from '$api/db/type'

export const getUploadIDsFromMessages = (messages: Message[]) => {
	const uploads = messages.flatMap((message) => {
		let res: string[] = []
		if (typeof message.content === 'string') {
			return []
		}
		if (Array.isArray(message.content)) {
			for (const content of message.content) {
				if (content.type === 'text') {
					continue
				} else if (content.type === 'reasoning') {
					continue
				} else if (content.type === 'tool-call') {
					continue
				} else if (content.type === 'image') {
					const url = content.image as string

					if (url.startsWith(Bun.env.PUBLIC_API_URL)) {
						const id = (content.image as string).split('/').pop()
						if (!id) continue
						res.push(id)
					}

					continue
				} else if (content.type === 'file') {
					const url = content.data as string

					if (url.startsWith(Bun.env.PUBLIC_API_URL)) {
						const id = (content.data as string).split('/').pop()

						if (!id) continue
						res.push(id)
					}
				} else if (
					content.type === 'tool-result' &&
					'files' in content.result
				) {
					const files: string[] = []
					for (const url of content.result.files as string[]) {
						if (url.startsWith(Bun.env.PUBLIC_API_URL)) {
							const id = (url as string).split('/').pop()

							if (!id) continue
							files.push(id)
						}
					}
					res = [...res, ...files]
				}
			}
		}
		return res
	})

	return uploads
}

export const replaceAttachment = (
	message: Message,
	uploadsData: {
		originalId: string
		id: string
		name: string
		createdAt: number
		userId: string
		key: string
		size: number
		mimeType: string
		visibility: 'private'
	}[],
) => {
	let res = []
	if (typeof message.content === 'string') {
		return message.content
	}
	if (Array.isArray(message.content)) {
		for (const content of message.content) {
			if (content.type === 'text') {
				res.push(content)
			} else if (content.type === 'reasoning') {
				res.push(content)
			} else if (content.type === 'tool-call') {
				res.push(content)
			} else if (
				content.type === 'tool-result' &&
				content.toolName === 'image_generation' &&
				'files' in content.result
			) {
				const files = content.result.files as string[]

				const final_files: string[] = []
				for (const url of files) {
					if (url.startsWith(Bun.env.PUBLIC_API_URL)) {
						const id = url.split('/').pop()
						if (!id) continue
						const upload = uploadsData.find(
							(data) => data.originalId === id,
						)
						if (upload) {
							final_files.push(
								Bun.env.PUBLIC_API_URL + '/file-upload/' + upload.id,
							)
						}
						continue
					}
				}

				res.push({
					...content,
					result: { files: final_files },
				})
			} else if (content.type === 'image') {
				const url = content.image as string

				if (url.startsWith(Bun.env.PUBLIC_API_URL)) {
					const id = (content.image as string).split('/').pop()
					if (!id) continue
					const upload = uploadsData.find(
						(data) => data.originalId === id,
					)
					if (upload) {
						res.push({
							type: 'image',
							image:
								Bun.env.PUBLIC_API_URL + '/file-upload/' + upload.id,
						})
					} else {
						res.push(content)
					}
					continue
				}

				continue
			} else if (content.type === 'file') {
				const url = content.data as string

				if (url.startsWith(Bun.env.PUBLIC_API_URL)) {
					const id = (content.data as string).split('/').pop()

					if (!id) continue

					const upload = uploadsData.find(
						(data) => data.originalId === id,
					)
					if (upload) {
						res.push({
							type: 'file',
							data:
								Bun.env.PUBLIC_API_URL + '/file-upload/' + upload.id,
							mimeType: upload.mimeType,
						})
					} else {
						res.push(content)
					}
					continue
				}
			} else {
				res.push(content)
			}
		}
	}
	return res
}
