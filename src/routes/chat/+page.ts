import { nanoid } from '$lib/nanoid'
import { redirect } from '@sveltejs/kit'

export const load = async () => {
	redirect(302, `/chat/${nanoid()}?type=new`)
}
