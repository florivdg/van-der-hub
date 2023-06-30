import { Context } from 'oak/mod.ts'
import { isAuthorized } from './auth.ts'
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
 * @param context The oak context
 */
export const handleGetBrowser = (context: Context) => {
  const json = JSON.stringify({ browser: browser.value })
  context.response.body = json
  context.response.headers.set('content-type', 'application/json')
}

/**
 * Handle the POST /browser request
 * @param context The oak context
 */
export const handleSetBrowser = async (context: Context) => {
  /// Make sure the request is authorized
  if (!isAuthorized(context)) return

  const { browser: newBrowser } = await context.request.body({ type: 'json' }).value
  if (!newBrowser || typeof newBrowser !== 'string') {
    context.response.status = 400
    context.response.body = 'Missing browser value'
    return
  }

  browser.value = newBrowser

  context.response.body = 'OK'
}

/**
 * Handle the GET /browser/live request that sends events when the default browser changes
 * @param context The oak context
 */
export const handleLiveBrowser = (context: Context) => {
  context.request.accepts('text/event-stream')

  /// Set CORS headers
  const headers = new Headers([['access-control-allow-origin', '*']])
  context.response.headers = headers
  const target = context.sendEvents({ keepAlive: true })

  /// Subscribe to changes to the default browser
  browser.subscribe((value) => {
    target.dispatchMessage(value)
  })

  /// Send the initial value
  target.dispatchMessage(browser.value)
}
