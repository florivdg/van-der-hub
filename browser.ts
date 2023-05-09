import { Context } from './deps.ts'
import { isAuthorized } from './auth.ts'

/**
 * Initialize the default browser value from the Deno.Kv storage
 * @returns The bundle identifier of my default browser
 */
async function getDefaultBrowser(): Promise<string> {
  const db = await Deno.openKv()
  const storedValue = await db.get<string>(['default_browser'], { consistency: 'eventual' })

  if (storedValue.value !== null) {
    return storedValue.value
  }

  /// Set the initial value if not present
  const initialValue = 'com.apple.Safari'
  await db.set(['default_browser'], initialValue)
  return initialValue
}

export const handleGetBrowser = async (context: Context) => {
  const defaultBrowser = await getDefaultBrowser()
  const json = JSON.stringify({ browser: defaultBrowser })
  context.response.body = json
  context.response.headers.set('content-type', 'application/json')
}

export const handleSetBrowser = async (context: Context) => {
  /// Make sure the request is authorized
  if (!isAuthorized(context)) return

  const { browser } = await context.request.body({ type: 'json' }).value
  if (!browser || typeof browser !== 'string') {
    context.response.status = 400
    context.response.body = 'Missing browser value'
    return
  }

  const db = await Deno.openKv()
  await db.set(['default_browser'], browser)

  context.response.body = 'OK'
}
