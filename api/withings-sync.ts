import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getTokenFromCookie } from './_lib/cookies.js'
import { setAuthenticatedCors } from './_lib/cors.js'
import { fetchMeasurements } from './_lib/withings.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setAuthenticatedCors(req, res)

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const session = getTokenFromCookie(req)
  if (!session) {
    return res.status(401).json({ error: 'Not connected to Withings' })
  }

  const lastUpdate = parseInt(req.query.lastupdate as string) || 0

  try {
    const { entries, session: updatedSession } = await fetchMeasurements(session, lastUpdate, res)

    // Find the latest timestamp for the client to store as lastSyncTimestamp
    const maxTimestamp = entries.reduce((max, e) => Math.max(max, e.timestamp), lastUpdate)

    return res.status(200).json({
      entries,
      lastSyncTimestamp: maxTimestamp,
      userId: updatedSession.userId,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed'
    return res.status(500).json({ error: message })
  }
}
