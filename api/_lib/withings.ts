import type { VercelResponse } from '@vercel/node'
import { setTokenCookie, type WithingsSession } from './cookies.js'

const TOKEN_URL = 'https://wbsapi.withings.net/v2/oauth2'
const MEASURE_URL = 'https://wbsapi.withings.net/measure'

const KG_TO_LBS = 2.20462

interface WithingsMeasure {
  grpid: number
  date: number // epoch seconds
  measures: Array<{
    type: number
    value: number
    unit: number // actual = value * 10^unit
  }>
}

export interface WithingsWeightEntry {
  grpid: number
  date: string // ISO date YYYY-MM-DD
  weight: number // lbs
  timestamp: number // epoch seconds
  fatPercent?: number
  fatMassLbs?: number
  muscleMassLbs?: number
  waterPercent?: number
  boneMassLbs?: number
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
  // Don't filter by meastype — fetch all types so we get body comp data
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

function parseRawValue(value: number, unit: number): number {
  return value * Math.pow(10, unit)
}

function parseMeasureGroups(groups: WithingsMeasure[], timezone?: string): WithingsWeightEntry[] {
  const entries: WithingsWeightEntry[] = []

  for (const grp of groups) {
    const weightMeasure = grp.measures.find((m) => m.type === 1)
    if (!weightMeasure) continue // skip groups without weight

    const weightKg = parseRawValue(weightMeasure.value, weightMeasure.unit)
    const weightLbs = Math.round(weightKg * KG_TO_LBS * 10) / 10

    // Convert timestamp to date in the user's timezone
    let date: string
    if (timezone) {
      date = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(grp.date * 1000))
    } else {
      const d = new Date(grp.date * 1000)
      date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }

    // Extract body composition from the same measurement group
    const entry: WithingsWeightEntry = {
      grpid: grp.grpid,
      date,
      weight: weightLbs,
      timestamp: grp.date,
    }

    for (const m of grp.measures) {
      const raw = parseRawValue(m.value, m.unit)
      switch (m.type) {
        case 6: // Fat mass (kg)
          entry.fatMassLbs = Math.round(raw * KG_TO_LBS * 10) / 10
          break
        case 8: // Fat %
          entry.fatPercent = Math.round(raw * 10) / 10
          break
        case 76: // Muscle mass (kg)
          entry.muscleMassLbs = Math.round(raw * KG_TO_LBS * 10) / 10
          break
        case 77: // Water %
          entry.waterPercent = Math.round(raw * 10) / 10
          break
        case 88: // Bone mass (kg)
          entry.boneMassLbs = Math.round(raw * KG_TO_LBS * 10) / 10
          break
      }
    }

    // Fallback: compute fat % from fat mass and weight if not provided directly
    if (entry.fatPercent === undefined && entry.fatMassLbs !== undefined) {
      entry.fatPercent = Math.round((entry.fatMassLbs / weightLbs) * 1000) / 10
    }

    entries.push(entry)
  }

  return entries
}
