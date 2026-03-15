import type { VercelResponse } from '@vercel/node'
import { setTokenCookie, type WithingsSession } from './cookies.js'

const TOKEN_URL = 'https://wbsapi.withings.net/v2/oauth2'
const MEASURE_URL = 'https://wbsapi.withings.net/measure'

const KG_TO_LBS = 2.20462

interface WithingsMeasure {
  grpid: number
  date: number // epoch seconds
  measures: Array<{
    type: number // 1 = weight
    value: number
    unit: number // actual = value * 10^unit
  }>
}

export interface WithingsWeightEntry {
  grpid: number
  date: string // ISO date YYYY-MM-DD
  weight: number // lbs
  timestamp: number // epoch seconds
}

async function tokenRequest(params: URLSearchParams): Promise<any> {
  const clientId = process.env.WITHINGS_CLIENT_ID
  const clientSecret = process.env.WITHINGS_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('WITHINGS_CLIENT_ID and WITHINGS_CLIENT_SECRET must be set')
  }

  params.set('client_id', clientId)
  params.set('client_secret', clientSecret)

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  const data = await response.json()
  if (data.status !== 0) {
    throw new Error(`Withings API error (status ${data.status}): ${JSON.stringify(data)}`)
  }
  return data.body
}

export async function exchangeCode(code: string, redirectUri: string): Promise<WithingsSession> {
  const params = new URLSearchParams()
  params.set('action', 'requesttoken')
  params.set('grant_type', 'authorization_code')
  params.set('code', code)
  params.set('redirect_uri', redirectUri)

  const body = await tokenRequest(params)

  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt: Date.now() + body.expires_in * 1000,
    userId: String(body.userid),
  }
}

export async function refreshTokens(
  session: WithingsSession,
  res: VercelResponse
): Promise<WithingsSession> {
  const params = new URLSearchParams()
  params.set('action', 'requesttoken')
  params.set('grant_type', 'refresh_token')
  params.set('refresh_token', session.refreshToken)

  const body = await tokenRequest(params)

  const newSession: WithingsSession = {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt: Date.now() + body.expires_in * 1000,
    userId: session.userId,
  }

  setTokenCookie(res, newSession)
  return newSession
}

export async function fetchMeasurements(
  session: WithingsSession,
  lastUpdate: number,
  res: VercelResponse,
  timezone?: string
): Promise<{ entries: WithingsWeightEntry[]; session: WithingsSession }> {
  let currentSession = session

  // Refresh token if expired
  if (Date.now() > currentSession.expiresAt) {
    currentSession = await refreshTokens(currentSession, res)
  }

  const params = new URLSearchParams()
  params.set('action', 'getmeas')
  params.set('meastype', '1') // weight
  params.set('category', '1') // real measurements only
  if (lastUpdate > 0) {
    params.set('lastupdate', String(lastUpdate))
  }

  const response = await fetch(MEASURE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${currentSession.accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  const data = await response.json()

  // Handle expired token (401-like status)
  if (data.status === 401) {
    currentSession = await refreshTokens(currentSession, res)
    // Retry once
    const retryResponse = await fetch(MEASURE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentSession.accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })
    const retryData = await retryResponse.json()
    if (retryData.status !== 0) {
      throw new Error(`Withings API error after refresh (status ${retryData.status})`)
    }
    return { entries: parseMeasureGroups(retryData.body.measuregrps ?? [], timezone), session: currentSession }
  }

  if (data.status !== 0) {
    throw new Error(`Withings API error (status ${data.status})`)
  }

  return {
    entries: parseMeasureGroups(data.body.measuregrps ?? [], timezone),
    session: currentSession,
  }
}

function parseMeasureGroups(groups: WithingsMeasure[], timezone?: string): WithingsWeightEntry[] {
  const entries: WithingsWeightEntry[] = []

  for (const grp of groups) {
    const weightMeasure = grp.measures.find((m) => m.type === 1)
    if (!weightMeasure) continue

    const kg = weightMeasure.value * Math.pow(10, weightMeasure.unit)
    const lbs = Math.round(kg * KG_TO_LBS * 10) / 10 // round to 0.1

    // Convert timestamp to date in the user's timezone
    let date: string
    if (timezone) {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(grp.date * 1000))
      date = parts // en-CA format is YYYY-MM-DD
    } else {
      const d = new Date(grp.date * 1000)
      date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }

    entries.push({
      grpid: grp.grpid,
      date,
      weight: lbs,
      timestamp: grp.date,
    })
  }

  return entries
}
