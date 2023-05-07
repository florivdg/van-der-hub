import { serve } from './deps.ts'

/// Check if the required environment variables are set
if (!Deno.env.get('TOKEN')) {
  throw new Error('Environment variable "TOKEN" is not set!')
}

/**
 * Initialize the default browser value from the Deno.Kv storage
 * @returns The bundle identifier of my default browser
 */
async function getDefaultBrowser(): Promise<string> {
  const db = await Deno.openKv()
  const storedValue = await db.get<string>(['default_browser'])

  if (storedValue.value !== null) {
    return storedValue.value
  }

  /// Set the initial value if not present
  const initialValue = 'com.apple.Safari'
  await db.set(['default_browser'], initialValue)
  return initialValue
}

/**
 * Handle the incoming requests.
 * @param req The incoming request.
 * @returns A response.
 */
async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url)

  if (url.pathname === '/set' && req.method === 'POST') {
    const { browser } = await req.json()
    const db = await Deno.openKv()
    await db.set(['default_browser'], browser)

    return new Response('OK')
  } else if (url.pathname === '/get' && req.method === 'GET') {
    const defaultBrowser = await getDefaultBrowser()
    const json = JSON.stringify({ browser: defaultBrowser })
    return new Response(json, {
      headers: { 'content-type': 'application/json' },
    })
  }

  return new Response('Not Found', { status: 404 })
}

serve(handler)
