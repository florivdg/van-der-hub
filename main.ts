import { WebSocketServer } from 'https://deno.land/x/websocket@v0.1.4/mod.ts'
import { serve } from 'https://deno.land/std@0.181.0/http/server.ts'

/**
 * The WebSocket server.
 */
const wss = new WebSocketServer(8787)

/**
 * Use a proxy to set the browser name and trigger side effects.
 */
const browser = new Proxy(
  {
    value: 'unknown', /// TODO: Initial persistent value (from disk?)
  },
  {
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

        /// Set the internal value
        target.value = value
      }

      return true
    },
  },
)

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
    const body = await request.json()
    browser.value = body.browser

    return new Response('OK', { status: 200 })
  }

  return new Response('Not Found', { status: 404 })
}

/// Start the HTTP server
await serve(handler, { port: 8686 })
