import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const browsersTable = sqliteTable('browsers', {
  id: integer().primaryKey({ autoIncrement: true }),
  browserKey: text().notNull(),
  machineKey: text().notNull(),
  createdAt: integer({ mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})
