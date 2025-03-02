import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'

const dbUrl = Deno.env.get('TURSO_DATABASE_URL')
if (!dbUrl) {
  throw new Error('TURSO_DATABASE_URL is not defined')
}

const authToken = Deno.env.get('TURSO_AUTH_TOKEN')
if (!authToken) {
  throw new Error('TURSO_AUTH_TOKEN is not defined')
}

const client = createClient({
  url: dbUrl,
  authToken,
})

export const db = drizzle({ client })
