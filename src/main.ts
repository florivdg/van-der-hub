import WebSocket, { WebSocketServer } from 'ws'

/**
 * The WebSocket server.
 */
const wss = new WebSocketServer({ port: 8787 })

/**
 * Use a proxy to set the browser name and trigger side effects.
 */
const browser = new Proxy(
  {
    value: 'unknown',
  },
  {
    set: (target, prop, value) => {
      if (prop === 'value') {
        target.value = value

        /// Send browser name to all clients
        wss.clients.forEach(function each(client) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(value)
          }
        })
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
