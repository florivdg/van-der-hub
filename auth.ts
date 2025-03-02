import { bearerAuth } from '@hono/hono/bearer-auth'

/// Check if the required environment variables are set
const TOKEN = Deno.env.get('TOKEN')
if (!TOKEN) throw new Error('Environment variable "TOKEN" is not set!')

export const bearerAuthMiddleware = bearerAuth({ token: TOKEN })
