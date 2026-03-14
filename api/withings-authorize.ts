import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomBytes } from 'crypto'
import { setStateCookie } from './_lib/cookies.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    return res.status(204).end()
  }

  const clientId = process.env.WITHINGS_CLIENT_ID
  const redirectUri = process.env.WITHINGS_REDIRECT_URI
  if (!clientId || !redirectUri) {
    return res.status(500).json({ error: 'Withings OAuth not configured' })
  }

  const state = randomBytes(16).toString('hex')
  setStateCookie(res, state)

  const authorizeUrl = new URL('https://account.withings.com/oauth2_user/authorize2')
  authorizeUrl.searchParams.set('response_type', 'code')
  authorizeUrl.searchParams.set('client_id', clientId)
  authorizeUrl.searchParams.set('redirect_uri', redirectUri)
  authorizeUrl.searchParams.set('scope', 'user.metrics')
  authorizeUrl.searchParams.set('state', state)

  const cookieHeaders = res.getHeader('Set-Cookie')
  const headers: Record<string, any> = { Location: authorizeUrl.toString() }
  if (cookieHeaders) headers['Set-Cookie'] = cookieHeaders
  res.writeHead(302, headers)
  res.end()
}
