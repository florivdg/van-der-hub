import type { Context } from '@hono/hono'
import { effect, signal } from 'alien-signals'

/// The key used to store the default browser in Deno.Kv
const KV_KEY = ['default_browser']

/// Initialize the default browser value from Deno.Kv
const stored = await loadFromKv()
// Replace Reactive with alien-signals signal
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
 * Handle the POST /browser request
 * @param c The Hono context
 */
export const handleSetBrowser = async (c: Context) => {
  const { browser: newBrowser } = await c.req.json()
  if (!newBrowser || typeof newBrowser !== 'string') {
    c.status(400)
    return c.text('Missing browser value')
  }

  // Update via signal setter
  browser(newBrowser)
  return c.text('OK')
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
      effect(() => {
        enqueue(controller, browser())
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
