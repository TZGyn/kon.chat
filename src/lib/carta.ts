import { Carta } from 'carta-md'
import DOMPurify from 'isomorphic-dompurify'
import { math } from '@cartamd/plugin-math'
import { code } from '@cartamd/plugin-code'

// component not working in svelte 5
// check updates:
// https://github.com/BearToCode/carta/pull/146
// https://github.com/BearToCode/carta/issues/117
// const mapped = [
// 	svelteCustom(
// 		'h1',
// 		(node) => {
// 			console.log(node)
// 			return true
// 		},
// 		Code,
// 	),
// ]

export const carta = new Carta({
	sanitizer: DOMPurify.sanitize,
	extensions: [
		// component(mapped, initializeComponents),
		math(),
		code(),
	],
	theme: 'catppuccin-mocha',
})
