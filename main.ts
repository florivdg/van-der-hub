import { Application } from './deps.ts'
import { router } from './router.ts'

// Create a new Oak application instance
const app = new Application()

// Use the router middleware
app.use(router.routes())
app.use(router.allowedMethods())

// Add a not found route
app.use((context) => {
  context.response.status = 404
  context.response.body = '404 Not Found'
})

// Start the server
const port = 8000
console.log(`Listening on http://localhost:${port}`)
await app.listen({ port })
