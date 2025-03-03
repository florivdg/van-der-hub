import type { Context } from '@hono/hono'
import { effect, effectScope, signal } from 'alien-signals'
import { desc, gt, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from './db/index.ts'
import { browsersTable } from './db/schema.ts'

/// The key used to store the default browser in Deno.Kv
const KV_KEY = ['default_browser']

/// Initialize the default browser value from Deno.Kv
const stored = await loadFromKv()

// Store browser in reactive signal
const browser = signal(stored)

// Create a BroadcastChannel to communicate with other edge instances
const channel = new BroadcastChannel('earth')

// Handle messages from other edge instances
channel.onmessage = (event) => {
  if (event.data === browser()) return
  browser(event.data)
}

// Subscribe to changes to the default browser using effect
effect(async () => {
  const newValue = browser()
  channel.postMessage(newValue)

  const db = await Deno.openKv()
  await db.set(KV_KEY, newValue)
  console.log(`Updated default browser to ${newValue}`)
})

/**
 * Initialize the default browser value from the Deno.Kv storage
 * @returns The bundle identifier of my default browser
 */
async function loadFromKv(): Promise<string> {
  const db = await Deno.openKv()
  const storedValue = await db.get<string>(KV_KEY, { consistency: 'eventual' })

  if (storedValue.value !== null) {
    return storedValue.value
  }

  /// Set the initial value if not present
  const initialValue = 'com.apple.Safari'
  await db.set(KV_KEY, initialValue)
  return initialValue
}

/**
 * Handle the GET /browser request
 * @param c The Hono context
 */
export const handleGetBrowser = (c: Context) => c.json({ browser: browser() })

/**
 * Handle the GET /browser/history request
 * @param c The Hono context
 */
export const handleGetBrowserHistory = async (c: Context) => {
  const limit = c.req.query('limit')
  const entries = await db
    .select()
    .from(browsersTable)
    .orderBy(desc(browsersTable.createdAt))
    .limit(limit ? Number(limit) : 10)
  return c.json(entries)
}

/**
 * Handle the GET /browser/stats request
 * @param c The Hono context
 */
export const handleGetBrowserStats = async (c: Context) => {
  // Get and validate the days query parameter using zod
  const daysParam = c.req.query('days')
  let threshold: number
  let effectiveDays: number | string

  if (daysParam) {
    const daysSchema = z.union([z.literal('all'), z.preprocess((val) => Number(val), z.number().int().min(1))])
    const parsed = daysSchema.safeParse(daysParam)
    if (!parsed.success) {
      c.status(400)
      return c.json({ error: 'Invalid days parameter: must be "all" or an integer >= 1' })
    }
    if (parsed.data === 'all') {
      threshold = 0
      effectiveDays = 'all'
    } else {
      threshold = Math.floor(Date.now() / 1000) - parsed.data * 86400
      effectiveDays = parsed.data
    }
  } else {
    threshold = Math.floor(Date.now() / 1000) - 30 * 86400
    effectiveDays = 30
  }

  // Build the query
  const query = db
    .select()
    .from(browsersTable)
    .orderBy(desc(browsersTable.createdAt))
    .where(gt(browsersTable.createdAt, sql`${threshold}`))

  // Execute the query
  const entries = await query.all()

  // Compute browser distribution: count of each browserKey.
  const browserDistribution = entries.reduce(
    (acc, entry) => {
      acc[entry.browserKey] = (acc[entry.browserKey] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  // Compute machine (Mac) distribution: count of each machineKey.
  const machineDistribution = entries.reduce(
    (acc, entry) => {
      acc[entry.machineKey] = (acc[entry.machineKey] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  // Compute browser distribution separated by machines
  const machineBrowserDistribution = entries.reduce(
    (acc, entry) => {
      if (!acc[entry.machineKey]) acc[entry.machineKey] = {}
      acc[entry.machineKey][entry.browserKey] = (acc[entry.machineKey][entry.browserKey] || 0) + 1
      return acc
    },
    {} as Record<string, Record<string, number>>,
  )

  // Compute time series distribution: browser usage for each day, separated by browser
  const timeSeriesDistribution = entries.reduce(
    (acc, entry) => {
      const day = new Date(Number(entry.createdAt)).toISOString().split('T')[0]
      if (!acc[day]) acc[day] = {}
      acc[day][entry.browserKey] = (acc[day][entry.browserKey] || 0) + 1
      return acc
    },
    {} as Record<string, Record<string, number>>,
  )

  // Return all the stats as JSON.
  return c.json({
    totalEntries: entries.length,
    days: effectiveDays,
    browserDistribution,
    machineDistribution,
    machineBrowserDistribution,
    timeSeriesDistribution,
  })
}

/**
 * Handle the POST /browser request
 * @param c The Hono context
 */
export const handleSetBrowser = async (c: Context) => {
  const { browser: newBrowser, machine } = await c.req.json()
  if (!newBrowser || typeof newBrowser !== 'string') {
    c.status(400)
    return c.text('Missing browser value')
  }

  // Update via signal setter
  browser(newBrowser)

  // Persist to database
  const entry = await db
    .insert(browsersTable)
    .values({
      browserKey: newBrowser,
      machineKey: machine ?? 'unknown',
    })
    .returning()

  return c.json(entry)
}

/**
 * Enqueues a value to the given ReadableStream controller.
 * The value is encoded as a UTF-8 string and prepended with "data: ".
 * Each value is separated by two newline character.
 *
 * @param {ReadableStreamDefaultController<Uint8Array>} controller - The ReadableStream controller.
 * @param {string} value - The value to enqueue.
 */
const enqueue = (controller: ReadableStreamDefaultController<Uint8Array>, value: string) => {
  const encodedValue = new TextEncoder().encode(`data: ${value}\n\n`)
  controller.enqueue(encodedValue)
}

/**
 * Handle the GET /browser/live request that sends events when the default browser changes
 * @param c The Hono context
 */
export const handleLiveBrowser = (c: Context) => {
  const body = new ReadableStream({
    start(controller) {
      const stopScope = effectScope(() => {
        effect(() => {
          try {
            enqueue(controller, browser())
          } catch (_) {
            stopScope()
          }
        })
      })
    },
  })

  // Set the headers
  c.header('Access-Control-Allow-Origin', '*')
  c.header('Content-Type', 'text/event-stream')
  c.header('Cache-Control', 'no-cache')
  c.header('Connection', 'keep-alive')

  return c.body(body)
}
