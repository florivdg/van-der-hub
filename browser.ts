import { Context } from 'hono'
import Reactive from './classes/Reactive.ts'

/// The key used to store the default browser in Deno.Kv
const KV_KEY = ['default_browser']

/// Store the default browser in a Reactive object
const stored = await loadFromKv()
const browser = new Reactive(stored)

/// Create a BroadcastChannel to communicate with other edge instances
const channel = new BroadcastChannel('earth')

/// Handle messages from other edge instances
channel.onmessage = (event) => {
  if (event.data === browser.value) return

  browser.value = event.data
}

/// Subscribe to changes to the default browser
browser.subscribe(async (value) => {
  /// Broadcast the change to all edge instances
  channel.postMessage(value)

  /// Update the value in Deno.Kv
  const db = await Deno.openKv()
  await db.set(KV_KEY, value)

  console.log(`Updated default browser to ${value}`)
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
export const handleGetBrowser = (c: Context) => c.json({ browser: browser.value })

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

  browser.value = newBrowser

  return c.text('OK')
}

/**
 * Map of subscribers with their corresponding unsubscribe functions.
 */
const subscribers = new Map<string, () => void>()

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
  // Generate a unique identifier for the subscription
  const id = Math.random().toString(36).substring(2, 15)

  const body = new ReadableStream({
    start(controller) {
      // Subscribe to changes to the default browser
      const unsubscribe = browser.subscribe((value) => {
        enqueue(controller, value)
      })

      // Store the unsubscribe function in the subscribers map
      subscribers.set(id, unsubscribe)

      // Send the initial value
      enqueue(controller, browser.value)
    },
    cancel() {
      // Retrieve the unsubscribe function from the subscribers map and call it
      const unsubscribe = subscribers.get(id)
      if (unsubscribe) unsubscribe()

      // Remove the entry from the subscribers map
      subscribers.delete(id)
    },
  })

  // Set the headers
  c.header('Access-Control-Allow-Origin', '*')
  c.header('Content-Type', 'text/event-stream')
  c.header('Cache-Control', 'no-cache')
  c.header('Connection', 'keep-alive')

  return c.body(body)
}
