import { bearerAuth } from 'hono/middleware'
import { load } from 'dotenv/mod.ts'

/// Check if the required environment variables are set
let { TOKEN } = Deno.env.toObject()
if (!TOKEN) {
  /// In development, we need to load the .env file
  /// On Deno Deploy, the environment variables are already set
  const conf = await load()
  TOKEN = conf.TOKEN

  if (!TOKEN) throw new Error('Environment variable "TOKEN" is not set!')
}

export const bearerAuthMiddleware = bearerAuth({ token: TOKEN })
