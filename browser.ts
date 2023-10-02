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
 * Handle the GET /browser/live request that sends events when the default browser changes
 * @param c The Hono context
 */
export const handleLiveBrowser = (c: Context) => {
  if (c.req.header('accept') !== 'text/event-stream' || c.req.header('upgrade') !== 'websocket') {
    c.status(501)
    return c.text('Need to accept text/event-stream and allow upgrade to WebSocket connection')
  }

  /// Upgrade the request to a WebSocket connection
  const { response, socket } = Deno.upgradeWebSocket(c.req.raw)

  /// Subscribe to changes to the default browser
  const unsubscribe = browser.subscribe((value) => {
    socket.send(value)
  })

  /// Unsubscribe when the connection closes
  socket.addEventListener('close', unsubscribe)

  /// Send the initial value
  socket.send(browser.value)

  return response
}
