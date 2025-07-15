import { paraglideVitePlugin } from '@inlang/paraglide-js'
import tailwindcss from '@tailwindcss/vite'
import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'
import { PUBLIC_APP_URL } from '$env/static/public'

export default defineConfig({
	plugins: [
		sveltekit(),
		tailwindcss(),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			strategy: ['cookie', 'baseLocale'],
		}),
	],
	server: {
		fs: {
			allow: ['./backend/lib/api-client.ts'],
		},
		watch: {
			ignored: ['**/backend/**'],
		},
	},
	preview: {
		allowedHosts: [PUBLIC_APP_URL],
	},
})
