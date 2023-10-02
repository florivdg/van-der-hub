import { Hono } from 'hono'
import { cors } from 'hono/middleware'
import { handleGetBrowser, handleLiveBrowser, handleSetBrowser } from './browser.ts'
import { bearerAuthMiddleware } from './auth.ts'

// Create a new router instance
const browserRouter = new Hono()

// CORS
browserRouter.use('/live', cors())

// Auth
browserRouter.use('/set', bearerAuthMiddleware)

// Define the routes
browserRouter.get('/get', handleGetBrowser).post('/set', handleSetBrowser).get('/live', handleLiveBrowser)

export { browserRouter }
