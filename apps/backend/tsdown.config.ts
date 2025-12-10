import { defineConfig } from 'tsdown'

export default defineConfig([
	{
		entry: ['./index.ts'],
		platform: 'node',
		clean: false,
		dts: true,
		ignoreWatch: [
			'./.turbo',
			'./src/routes',
			'./lib',
			'./file-router',
		],
	},
])
