import WebSocket, { WebSocketServer } from 'ws'
import Fastify from 'fastify'

/**
 * The WebSocket server.
 */
const wss = new WebSocketServer({ path: '/live', port: 8787 })

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
          if (client.readyState === WebSocket.OPEN) {
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
 * Simulate a browser name change.
 */
setTimeout(() => {
  browser.value = 'com.google.Chrome'
}, 10000)

/**
 * The Fastify server.
 */
const fastify = Fastify({
  logger: false,
})

/**
 * POST /set
 * Set the browser name.
 */
fastify.post<{ Body: { browser: string } }>('/set', async (request, reply) => {
  /// TODO: Auth
  browser.value = request.body.browser
})

// Run the server!
fastify.listen({ port: 8686 }, (err, address) => {
  if (err) throw err
  // Server is now listening on ${address}
})
