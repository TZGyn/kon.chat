// import adapter from '@sveltejs/adapter-node'
// import adapter from 'svelte-adapter-bun-next'
import adapter from '@sveltejs/adapter-static'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		alias: {
			$api: './backend/lib',
			'$api/*': './backend/lib/*',
		},
		// adapter: adapter(),
		adapter: adapter({
			// pages: 'build',
			// assets: 'build',
			fallback: '200.html',
		}),
	},
}

export default config
