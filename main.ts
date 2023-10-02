import { Hono } from 'hono'
import { browserRouter } from './router.ts'

// Create a new Hono instance
const app = new Hono()

// Use the router middleware
app.route('/browser', browserRouter)

// Add a not found route
app.notFound((c) => {
  return c.json({ success: false, message: '404 Not Found' })
})

// Add an error handler
app.use(async (c, next) => {
  try {
    await next()
  } catch (err) {
    c.status = err.status ?? 500
    return c.json({
      success: false,
      message: err.message ?? 'An unknown error occurred',
    })
  }
})

// Start the server
const port = 8000
console.log(`Listening on http://localhost:${port}`)
Deno.serve({ port }, app.fetch)
