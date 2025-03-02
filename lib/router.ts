import { Hono } from '@hono/hono'
import { cors } from '@hono/hono/cors'
import { bearerAuthMiddleware } from './auth.ts'
import { handleGetBrowser, handleGetBrowserHistory, handleLiveBrowser, handleSetBrowser } from './browser.ts'
import { handleBroadcastMessage } from './noti.ts'

// Create a new router instance
const browserRouter = new Hono()

// CORS
browserRouter.use('/live', cors())

// Auth
browserRouter.use('/set', bearerAuthMiddleware)

// Define the routes
browserRouter
  .get('/get', handleGetBrowser)
  .post('/set', handleSetBrowser)
  .get('/live', handleLiveBrowser)
  .get('/history', handleGetBrowserHistory)

// Create a noti namespace router
const notiRouter = new Hono()
notiRouter.use('/broadcast', bearerAuthMiddleware).post('/broadcast', handleBroadcastMessage)

export { browserRouter, notiRouter }
