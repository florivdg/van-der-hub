import { Context } from 'oak/mod.ts'
import { isAuthorized } from './auth.ts'
import Reactive from './classes/Reactive.ts'

/// The key used to store the default browser in Deno.Kv
const KV_KEY = ['default_browser']

/// Store the default browser in a Reactive object
const stored = await loadFromKv()
const browser = new Reactive(stored)

/// Subscribe to changes to the default browser and update the Deno.Kv storage
browser.subscribe(async (value) => {
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
