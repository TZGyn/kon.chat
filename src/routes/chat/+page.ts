import { encodeBase32 } from '$lib/encoding/base32'
import { redirect } from '@sveltejs/kit'

export const load = async () => {
	redirect(302, `/chat/${generateId()}?type=new`)
}

const generateId = () => {
	const tokenBytes = new Uint8Array(20)
	crypto.getRandomValues(tokenBytes)
	const token = encodeBase32(tokenBytes).toLowerCase()
	return token
}
