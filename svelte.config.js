// import adapter from '@sveltejs/adapter-node'
import adapter from 'svelte-adapter-bun-next'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		alias: {
			$api: './src/routes/api/(src)/lib',
			'$api/*': './src/routes/api/(src)/lib/*',
		},
		adapter: adapter(),
		// adapter: adapter({
		// 	// pages: 'build',
		// 	// assets: 'build',
		// 	fallback: '404.html',
		// }),
	},
}

export default config
