import { Resource, ScrapedRepo, CategoryMap } from './types'

export function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export function repoShortName(url: string) {
  return url.replace('https://github.com/', '').split('/').slice(0, 2).join('/')
}

export function calcScore(stars: number | null, description: string, crossRefs: string[]): number {
  let score = 5
  if (stars !== null) {
    if (stars > 100000) score += 3
    else if (stars > 10000) score += 2.5
    else if (stars > 1000) score += 2
    else if (stars > 100) score += 1
    else if (stars > 0) score += 0.5
  }
  if (description && description.length > 30) score += 0.5
  if (crossRefs.length > 0) score += 0.5
  return Math.min(10, Math.round(score * 10) / 10)
}

export function parseStars(raw: number | string | null | undefined): { stars: number | null; display: string } {
  if (raw === null || raw === undefined || raw === 0 || raw === '0') return { stars: null, display: '—' }
  const n = typeof raw === 'string' ? parseInt(raw.replace(/[^0-9]/g, '')) : raw
  if (!n || isNaN(n)) return { stars: null, display: '—' }
  if (n >= 1000000) return { stars: n, display: `${(n / 1000000).toFixed(1)}m` }
  if (n >= 1000) return { stars: n, display: `${(n / 1000).toFixed(0)}k` }
  return { stars: n, display: String(n) }
}

// Extract star count from description text like "★ 12k stars" or "12,345 stars"
function extractStarsFromText(text: string): number | null {
  if (!text) return null
  const patterns = [
    /★\s*([\d,.]+)k/i,
    /★\s*([\d,.]+)m/i,
    /★\s*([\d,]+)/,
    /([\d,.]+)k\s*stars?/i,
    /([\d,.]+)m\s*stars?/i,
    /([\d,]+)\s*stars?/i,
    /stars?[:\s]+([\d,]+)/i,
  ]
  for (const pattern of patterns) {
    const m = text.match(pattern)
    if (m) {
      const raw = m[1].replace(/,/g, '')
      const n = parseFloat(raw)
      if (!isNaN(n)) {
        if (pattern.source.includes('m')) return Math.round(n * 1000000)
        if (pattern.source.includes('k') || text.slice(m.index, m.index! + m[0].length).toLowerCase().includes('k')) return Math.round(n * 1000)
        return Math.round(n)
      }
    }
  }
  return null
}

export async function fetchGitHubStars(repoUrls: string[]): Promise<Map<string, number>> {
  const starsMap = new Map<string, number>()
  const githubUrls = repoUrls.filter(u => u.includes('github.com'))

  // Batch fetch — GitHub API allows unauthenticated requests at 60/hour
  await Promise.allSettled(
    githubUrls.slice(0, 30).map(async (url) => {
      try {
        const match = url.match(/github\.com\/([^/]+\/[^/]+)/)
        if (!match) return
        const repo = match[1].replace(/\/$/, '').replace(/\.git$/, '')
        const res = await fetch(`https://api.github.com/repos/${repo}`, {
          headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'awesome-aggregator' },
        })
        if (!res.ok) return
        const data = await res.json()
        if (data.stargazers_count) starsMap.set(url, data.stargazers_count)
      } catch { /* ignore */ }
    })
  )
  return starsMap
}

export function processRepos(scrapedRepos: { repo: ScrapedRepo; sourceUrl: string }[]): Resource[] {
  const allResources: Resource[] = []
  const urlMap = new Map<string, Resource>()

  for (const { repo, sourceUrl } of scrapedRepos) {
    const shortName = repoShortName(sourceUrl)
    for (const cat of repo.categories || []) {
      for (const subcat of cat.subcategories || []) {
        for (const r of subcat.resources || []) {
          if (!r.url || !r.name) continue

          // Try to get stars from the scraped resource data
          const rawStars = (r as any).stars ?? (r as any).stargazers_count ?? null
          const starsFromText = extractStarsFromText(r.description || '')
          const { stars, display } = parseStars(rawStars ?? starsFromText)

          const existing = urlMap.get(r.url)
          if (existing) {
            if (!existing.crossRefs.includes(shortName)) existing.crossRefs.push(shortName)
            // Update stars if we now have them and didn't before
            if (stars !== null && existing.stars === null) {
              existing.stars = stars
              existing.starsDisplay = display
            }
          } else {
            const resource: Resource = {
              id: slugify(r.name) + '-' + Math.random().toString(36).slice(2, 6),
              name: r.name,
              url: r.url,
              description: r.description || '',
              tags: r.tags || [],
              stars,
              starsDisplay: display,
              score: 5,
              category: cat.name || 'General',
              subcategory: subcat.name || 'General',
              sourceRepo: shortName,
              crossRefs: [],
            }
            urlMap.set(r.url, resource)
            allResources.push(resource)
          }
        }
      }
    }
  }

  // Score all resources
  for (const r of allResources) {
    r.score = calcScore(r.stars, r.description, r.crossRefs)
  }

  return allResources
}

// Call this after processRepos to enrich GitHub resources with real star counts
export async function enrichWithStars(resources: Resource[], onUpdate: (updated: Resource[]) => void): Promise<void> {
  const githubResources = resources.filter(r => r.url.includes('github.com') && r.stars === null)
  if (githubResources.length === 0) return

  // Fetch in batches of 10 to avoid rate limits
  const batchSize = 10
  for (let i = 0; i < Math.min(githubResources.length, 50); i += batchSize) {
    const batch = githubResources.slice(i, i + batchSize)
    await Promise.allSettled(batch.map(async (resource) => {
      try {
        const match = resource.url.match(/github\.com\/([^/]+\/[^/#?]+)/)
        if (!match) return
        const repo = match[1].replace(/\/$/, '').replace(/\.git$/, '')
        const res = await fetch(`https://api.github.com/repos/${repo}`, {
          headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'awesome-aggregator' },
        })
        if (!res.ok) return
        const data = await res.json()
        if (data.stargazers_count > 0) {
          const { stars, display } = parseStars(data.stargazers_count)
          resource.stars = stars
          resource.starsDisplay = display
          resource.score = calcScore(stars, resource.description, resource.crossRefs)
        }
      } catch { /* ignore */ }
    }))
    // Trigger a re-render after each batch
    onUpdate([...resources])
    // Small delay between batches to be nice to GitHub API
    await new Promise(r => setTimeout(r, 300))
  }
}

export function buildCategoryMap(resources: Resource[]): CategoryMap {
  const map: CategoryMap = {}
  for (const r of resources) {
    if (!map[r.category]) map[r.category] = {}
    if (!map[r.category][r.subcategory]) map[r.category][r.subcategory] = []
    map[r.category][r.subcategory].push(r)
  }
  // Sort resources within each subcategory by score desc
  for (const cat of Object.values(map)) {
    for (const subcat of Object.values(cat)) {
      subcat.sort((a, b) => b.score - a.score)
    }
  }
  return map
}

export function countResources(map: CategoryMap): number {
  return Object.values(map).flatMap(Object.values).flat().length
}

export function countDupes(total: number, resources: Resource[]): number {
  return resources.filter(r => r.crossRefs.length > 0).length
}

export function exportJSON(resources: Resource[]): void {
  const blob = new Blob([JSON.stringify(resources, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'awesome-resources.json'
  a.click()
}

export function exportCSV(resources: Resource[]): void {
  const headers = ['name', 'url', 'description', 'category', 'subcategory', 'tags', 'score', 'stars', 'source', 'crossRefs']
  const rows = resources.map(r => [
    r.name, r.url, r.description, r.category, r.subcategory,
    r.tags.join(';'), r.score, r.starsDisplay, r.sourceRepo, r.crossRefs.join(';')
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'awesome-resources.csv'
  a.click()
}
