import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', 'https://tare.swinch.dev')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const url = req.query.url as string | undefined
  if (!url || !url.includes('mise.swinch.dev/api/r')) {
    return res.status(400).json({ error: 'Invalid or missing Mise share URL' })
  }

  try {
    const response = await fetch(url)
    if (!response.ok) {
      return res.status(502).json({ error: `Mise returned ${response.status}` })
    }

    const html = await response.text()

    // Extract JSON-LD
    const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
    if (!match) {
      return res.status(404).json({ error: 'No JSON-LD found in share page' })
    }

    const jsonLd = JSON.parse(match[1])
    const n = jsonLd.nutrition
    if (!n) {
      return res.status(404).json({ error: 'No nutrition data in recipe' })
    }

    // Parse nutrition values — JSON-LD uses strings like "536 calories", "32 g"
    function parseNum(val: string | number | undefined): number {
      if (val === undefined || val === null) return 0
      if (typeof val === 'number') return val
      const m = String(val).match(/[\d.]+/)
      return m ? parseFloat(m[0]) : 0
    }

    return res.status(200).json({
      title: jsonLd.name || null,
      servings: parseNum(jsonLd.recipeYield),
      calories: parseNum(n.calories),
      protein: parseNum(n.proteinContent),
      fat: parseNum(n.fatContent),
      carbs: parseNum(n.carbohydrateContent),
      fiber: parseNum(n.fiberContent),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch recipe'
    return res.status(500).json({ error: message })
  }
}
