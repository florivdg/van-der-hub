import { Application, Router, load } from './deps.ts'

/// Check if the required environment variables are set
let { TOKEN } = Deno.env.toObject()
if (!TOKEN) {
  /// In development, we need to load the .env file
  /// On Deno Deploy, the environment variables are already set
  const conf = await load()
  TOKEN = conf.TOKEN

  if (!TOKEN) throw new Error('Environment variable "TOKEN" is not set!')
}

// Create a new router instance
const router = new Router()

// Define the routes
router
  .get('/', (context) => {
    context.response.body = 'Welcome on VanDerHub!'
  })
  .get('/browser/get', async (context) => {
    const defaultBrowser = await getDefaultBrowser()
    const json = JSON.stringify({ browser: defaultBrowser })
    context.response.body = json
    context.response.headers.set('content-type', 'application/json')
  })
  .post('/browser/set', async (context) => {
    if (context.params && context.params.name) {
      const name = context.params.name
      context.response.body = `Hello, ${name}!`
    }

    /// Make sure the request is authorized
    const token = context.request.headers.get('Authorization')
    if (!TOKEN || token !== `Bearer ${TOKEN}`) {
      context.response.body = 'Unauthorized'
      context.response.status = 401
    }
    const { browser } = await context.request.body({ type: 'json' }).value
    const db = await Deno.openKv()
    await db.set(['default_browser'], browser)

    context.response.body = 'OK'
  })

/**
 * Initialize the default browser value from the Deno.Kv storage
 * @returns The bundle identifier of my default browser
 */
async function getDefaultBrowser(): Promise<string> {
  const db = await Deno.openKv()
  const storedValue = await db.get<string>(['default_browser'], { consistency: 'eventual' })

  if (storedValue.value !== null) {
    return storedValue.value
  }

  /// Set the initial value if not present
  const initialValue = 'com.apple.Safari'
  await db.set(['default_browser'], initialValue)
  return initialValue
}

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
