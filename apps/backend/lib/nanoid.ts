// nanoid code
const urlAlphabet =
	'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict'
export const nanoid = (size = 32) => {
	let id = ''
	let bytes = crypto.getRandomValues(new Uint8Array((size |= 0)))
	while (size--) {
		// Using the bitwise AND operator to "cap" the value of
		// the random byte from 255 to 63, in that way we can make sure
		// that the value will be a valid index for the "chars" string.
		id += urlAlphabet[bytes[size] & 63]
	}
	return id
}
