import type { VercelRequest, VercelResponse } from '@vercel/node'
import { setTokenCookie, getStateCookie, clearStateCookie } from './_lib/cookies.js'
import { exchangeCode } from './_lib/withings.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    return res.status(204).end()
  }

  const code = req.query.code as string | undefined
  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' })
  }

  // Validate CSRF state
  const state = req.query.state as string | undefined
  const expectedState = getStateCookie(req)
  if (!state || !expectedState || state !== expectedState) {
    return res.status(403).json({ error: 'Invalid OAuth state parameter' })
  }

  const redirectUri = process.env.WITHINGS_REDIRECT_URI
  if (!redirectUri) {
    return res.status(500).json({ error: 'WITHINGS_REDIRECT_URI not configured' })
  }

  try {
    const session = await exchangeCode(code, redirectUri)

    if (!session.accessToken || typeof session.accessToken !== 'string') {
      throw new Error('Invalid token received from Withings')
    }

    setTokenCookie(res, session)
    clearStateCookie(res)

    // Redirect back to app — no tokens in URL
    const appUrl = new URL(redirectUri)
    const baseUrl = `${appUrl.protocol}//${appUrl.host}`
    const cookieHeaders = res.getHeader('Set-Cookie')
    const headers: Record<string, any> = { Location: `${baseUrl}/settings?withings=connected` }
    if (cookieHeaders) headers['Set-Cookie'] = cookieHeaders
    res.writeHead(302, headers)
    res.end()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.writeHead(302, { Location: `/settings?withings_error=${encodeURIComponent(message)}` })
    res.end()
  }
}
