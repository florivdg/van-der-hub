import { Router } from 'oak/mod.ts'
import { handleGetBrowser, handleLiveBrowser, handleSetBrowser } from './browser.ts'

// Create a new router instance
const router = new Router()

// Define the routes
router
  .get('/', (context) => {
    context.response.body = 'Welcome on VanDerHub!'
  })
  .get('/browser/get', handleGetBrowser)
  .post('/browser/set', handleSetBrowser)
  .get('/browser/live', handleLiveBrowser)

export { router }
