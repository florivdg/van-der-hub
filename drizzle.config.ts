import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  out: './drizzle',
  schema: './lib/db/schema.ts',
  dialect: 'turso',
  dbCredentials: {
    // biome-ignore lint: is supervised
    url: Deno.env.get('TURSO_DATABASE_URL')!,
    // biome-ignore lint: is supervised
    authToken: Deno.env.get('TURSO_AUTH_TOKEN')!,
  },
})
