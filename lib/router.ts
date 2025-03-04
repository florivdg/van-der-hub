import { Hono } from '@hono/hono'
import { cors } from '@hono/hono/cors'
import { bearerAuthMiddleware } from './auth.ts'
import {
  handleGetBrowser,
  handleGetBrowserHistory,
  handleGetBrowserStats,
  handleLiveBrowser,
  handleSetBrowser,
} from './browser.ts'
import { handleBroadcastMessage } from './noti.ts'

// Create a new router instance
const browserRouter = new Hono()

// CORS
const corsWithOrigins = cors({
  origin: ['http://localhost:4321', 'https://flori.dev'],
})
browserRouter.use('/live', corsWithOrigins)
browserRouter.use('/stats', corsWithOrigins)

// Auth
browserRouter.use('/set', bearerAuthMiddleware)

// Define the routes
browserRouter
  .get('/get', handleGetBrowser)
  .post('/set', handleSetBrowser)
  .get('/live', handleLiveBrowser)
  .get('/history', handleGetBrowserHistory)
  .get('/stats', handleGetBrowserStats)

// Create a noti namespace router
const notiRouter = new Hono()
notiRouter.use('/broadcast', bearerAuthMiddleware).post('/broadcast', handleBroadcastMessage)

export { browserRouter, notiRouter }
