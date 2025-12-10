import { getLocale, type Locale } from '../paraglide/runtime'

let lang = $state<Locale>(getLocale() || 'en')

export function useLocale() {
	const setLocale = (value: Locale) => {
		lang = value
	}
	return {
		setLocale,
		get lang() {
			return lang
		},
	}
}
