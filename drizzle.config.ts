// drizzle.config.ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
	schema: './src/routes/api/(src)/lib/db/schema.ts',
	out: './drizzle',
	dialect: 'postgresql',
	dbCredentials: {
		url: process.env.DATABASE_URL as string,
	},
})
