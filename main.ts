import { Hono } from '@hono/hono'
import { HTTPException } from '@hono/hono/http-exception'
import { browserRouter, notiRouter } from './lib/router.ts'

// Create a new Hono instance
const app = new Hono()

// Use the router middleware
app.route('/browser', browserRouter)
app.route('/noti', notiRouter)

// Add a not found route
app.notFound((c) => {
  return c.json({ success: false, message: '404 Not Found' })
})

// Add an error handler
app.use(async (c, next) => {
  try {
    await next()
  } catch (err) {
    if (err instanceof HTTPException) {
      c.status(err.status ?? 500)
      return c.json({
        success: false,
        message: err.message ?? 'An unknown error occurred',
      })
    }
  }
})

// Start the server
const port = 8000
Deno.serve({ port }, app.fetch)
