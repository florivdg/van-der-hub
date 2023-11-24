import type { Context } from 'hono'
import { load } from 'dotenv/mod.ts'

/// Check if the required environment variables are set
let { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = Deno.env.toObject()
if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  /// In development, we need to load the .env file
  /// On Deno Deploy, the environment variables are already set
  const conf = await load()
  TELEGRAM_BOT_TOKEN = conf.TELEGRAM_BOT_TOKEN
  TELEGRAM_CHAT_ID = conf.TELEGRAM_CHAT_ID

  if (!TELEGRAM_BOT_TOKEN) throw new Error('Environment variable "TELEGRAM_BOT_TOKEN" is not set!')
  if (!TELEGRAM_CHAT_ID) throw new Error('Environment variable "TELEGRAM_CHAT_ID" is not set!')
}

/**
 * Sends a message to a Telegram chat using the provided bot token and chat ID.
 * @param message - The message to be sent.
 * @throws Error if the Telegram bot token or chat ID is not provided, or if the message fails to send.
 */
const sendTelegramMessage = async (message: string) => {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
  const payload = {
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  return res.ok
}

/**
 * Handle the POST /broadcast request
 * @param c The Hono context
 */
export const handleBroadcastMessage = async (c: Context) => {
  const { message } = await c.req.json()
  if (!message || typeof message !== 'string') {
    c.status(400)
    return c.text('Please provide a message to broadcast.')
  }

  /// Broadcast via Telegram API
  const sent = await sendTelegramMessage(message)

  return c.json({ sent })
}
