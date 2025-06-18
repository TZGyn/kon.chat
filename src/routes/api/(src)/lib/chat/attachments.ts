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

					if (Bun.env.APP_URL && url.startsWith(Bun.env.APP_URL)) {
						const id = (content.image as string).split('/').pop()
						if (!id) continue
						res.push(id)
					}

					continue
				} else if (content.type === 'file') {
					const url = content.data as string

					if (Bun.env.APP_URL && url.startsWith(Bun.env.APP_URL)) {
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
						if (Bun.env.APP_URL && url.startsWith(Bun.env.APP_URL)) {
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
