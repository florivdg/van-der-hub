import { WebSocketServer } from 'https://deno.land/x/websocket@v0.1.4/mod.ts'
import { serve } from 'https://deno.land/std@0.181.0/http/server.ts'
import 'https://deno.land/std@0.181.0/dotenv/load.ts'

/// Check if the required environment variables are set
if (!Deno.env.get('TOKEN')) {
  throw new Error('TOKEN environment variable is not set!')
}

/**
 * The WebSocket server.
 */
const wss = new WebSocketServer(8787)

/**
 * Use a proxy to set the browser name and trigger side effects.
 */
const browser = new Proxy(
  {
    value: '',
  },
  {
    get: (target, prop) => {
      if (prop === 'value') {
        /// Check if there is value
        if (!target.value) {
          /// Try to read the browser name from disk
          try {
            const data = Deno.readFileSync('browser.txt')
            const decoder = new TextDecoder()
            target.value = decoder.decode(data)
          } catch (error) {
            /// Ignore errors
            console.error(error)
          }
        }

        return target.value
      }
    },
    set: (target, prop, value) => {
      if (prop === 'value') {
        /// Don't do anything if the value hasn't changed
        if (target.value === value) return true

        /// Send browser name to all clients
        wss.clients.forEach(function each(client) {
          if (client.state === WebSocket.OPEN) {
            client.send(value)
          }
        })

        /// Persist the browser name to disk
        persist(value)

        /// Set the internal value
        target.value = value
      }

      return true
    },
  },
)

/**
 * Persist the browser name to disk.
 * @param browser The browser bundle ID to persist.
 */
const persist = async (browser: string) => {
  const encoder = new TextEncoder()
  const data = encoder.encode(browser)

  await Deno.writeFile('browser.txt', data)
}

/**
 * Handle WebSocket connections.
 */
wss.on('connection', function connection(ws) {
  ws.on('error', console.error)

  /// Send browser name to client when it connects
  ws.send(browser.value)
})

/**
 * Handle HTTP requests.
 * @param request The incoming HTTP request.
 * @returns A HTTP response.
 */
const handler = async (request: Request): Promise<Response> => {
  const url = new URL(request.url)
  if (request.method === 'POST' && url.pathname === '/set' && request.body) {
    /// Grab Bearer token from Authorization header
    const auth = request.headers.get('Authorization')
    if (!auth || !auth.startsWith('Bearer ')) {
      return new Response('No Bearer token, no access.', { status: 401 })
    } else if (auth !== `Bearer ${Deno.env.get('TOKEN')}`) {
      return new Response('Nice try.', { status: 401 })
    }

    /// We're all good, set the browser name
    const body = await request.json()
    browser.value = body.browser

    return new Response('OK', { status: 200 })
  }

  return new Response('Not Found', { status: 404 })
}

/// Start the HTTP server
await serve(handler, { port: 8686 })
