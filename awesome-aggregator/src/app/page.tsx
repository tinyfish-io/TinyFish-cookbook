'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Resource, AgentState, ScrapedRepo, CategoryMap } from '@/lib/types'
import { processRepos, buildCategoryMap, exportJSON, exportCSV, repoShortName, enrichWithStars } from '@/lib/utils'

const TINYFISH_GOAL = (repoUrl: string) => `
Scrape this GitHub Awesome list README: ${repoUrl}

Parse ALL of the following:
1) Main categories (## headings)
2) Subcategories (### headings)
3) ALL linked resources under each section
4) For each resource: name, URL, description, tags (infer from context)

RULES:
- Stay on the README page only, do NOT navigate away
- If you see a file tree, click README.md first
- Get every single resource link, do not truncate

Return ONLY valid JSON with this exact structure, no markdown fences:
{
  "repoName": "string",
  "description": "string",
  "stars": 0,
  "lastUpdated": "string",
  "categories": [
    {
      "name": "string",
      "subcategories": [
        {
          "name": "string",
          "resources": [
            { "name": "string", "url": "string", "description": "string", "tags": ["string"] }
          ]
        }
      ]
    }
  ],
  "totalResources": 0
}
`

const QUICK_TOPICS = ['machine-learning', 'react', 'rust', 'devops', 'python', 'go', 'kubernetes', 'ai-tools', 'security', 'typescript']

type SortMode = 'quality' | 'stars' | 'az'
type View = 'all' | string

export default function Home() {
  const [topic, setTopic] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [agents, setAgents] = useState<AgentState[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [categoryMap, setCategoryMap] = useState<CategoryMap>({})
  const [dupeCount, setDupeCount] = useState(0)
  const [view, setView] = useState<View>('all')
  const [sort, setSort] = useState<SortMode>('quality')
  const [filter, setFilter] = useState('')
  const [compareList, setCompareList] = useState<Resource[]>([])
  const [showDashboard, setShowDashboard] = useState(false)
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'details' | 'crossrefs'>('overview')
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set())
  const [currentTopic, setCurrentTopic] = useState('')

  const scrapedRef = useRef<{ repo: ScrapedRepo; sourceUrl: string }[]>([])
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const map = buildCategoryMap(resources)
    setCategoryMap(map)
    setOpenCategories(new Set(Object.keys(map)))
  }, [resources])

  const updateAgent = useCallback((repoUrl: string, patch: Partial<AgentState>) => {
    setAgents(prev => prev.map(a => a.repoUrl === repoUrl ? { ...a, ...patch } : a))
  }, [])

  async function runAgent(repoUrl: string): Promise<void> {
    updateAgent(repoUrl, { status: 'running', statusText: 'Starting agent...' })

    try {
      const res = await fetch('/api/tinyfish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: repoUrl, goal: TINYFISH_GOAL(repoUrl) }),
        signal: abortRef.current?.signal,
      })

      if (!res.ok) {
        const err = await res.text()
        updateAgent(repoUrl, { status: 'error', statusText: `Error: ${res.status}`, error: err })
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let gotResult = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue

          // Strip "data:" prefix if present
          const raw = trimmed.startsWith('data:') ? trimmed.slice(5).trim() : trimmed

          // Try JSON first
          try {
            const payload = JSON.parse(raw)

            // Handle status updates — try every possible field name TinyFish might use
            const isStatus = payload.type === 'STATUS' || payload.type === 'status' || payload.status || payload.message || payload.step || payload.action
            if (isStatus && payload.type !== 'COMPLETE') {
              const msg = payload.message || payload.status || payload.step || payload.action || payload.text || JSON.stringify(payload).slice(0, 80)
              const countMatch = msg.match(/(\d+)\s+resource/i)
              updateAgent(repoUrl, {
                statusText: String(msg).slice(0, 80),
                ...(countMatch ? { resourceCount: parseInt(countMatch[1]) } : {}),
              })
            }

            // Handle completion
            const isComplete = payload.type === 'COMPLETE' || payload.type === 'complete' || payload.resultJson || payload.result
            if (isComplete) {
              const resultRaw = payload.resultJson || payload.result || payload.data
              if (resultRaw) {
                try {
                  const parsed: ScrapedRepo = typeof resultRaw === 'string' ? JSON.parse(resultRaw) : resultRaw
                  const count = parsed.totalResources || parsed.categories?.flatMap(c => c.subcategories?.flatMap(s => s.resources) || []).length || 0
                  updateAgent(repoUrl, { status: 'done', statusText: `✓ ${count} resources found`, resourceCount: count })
                  scrapedRef.current.push({ repo: parsed, sourceUrl: repoUrl })
                  const newResources = processRepos(scrapedRef.current)
                  setResources(newResources)
                  setDupeCount(newResources.filter(r => r.crossRefs.length > 0).length)
                  gotResult = true
                  // Enrich with real GitHub star counts in the background
                  enrichWithStars(newResources, (updated) => {
                    setResources(updated)
                  })
                } catch {
                  updateAgent(repoUrl, { status: 'error', statusText: 'Failed to parse result' })
                }
              }
            }
          } catch {
            // Not JSON — treat as plain text status message
            if (raw.length > 0 && raw.length < 200) {
              updateAgent(repoUrl, { statusText: raw.slice(0, 80) })
            }
          }
        }
      }
      if (!gotResult) updateAgent(repoUrl, { status: 'error', statusText: 'No result received' })
    } catch (e: any) {
      if (e.name === 'AbortError') return
      updateAgent(repoUrl, { status: 'error', statusText: `Failed: ${e.message}` })
    }
  }

  async function handleAggregate() {
    const t = topic.trim().toLowerCase()
    if (!t || isRunning) return
    setIsRunning(true)
    setAgents([])
    setResources([])
    setCategoryMap({})
    setDupeCount(0)
    setView('all')
    setFilter('')
    setCompareList([])
    scrapedRef.current = []
    setCurrentTopic(t)
    abortRef.current = new AbortController()
    try {
      const reposRes = await fetch(`/api/github-repos?topic=${encodeURIComponent(t)}`)
      if (!reposRes.ok) { alert('No awesome repos found for this topic. Try another!'); setIsRunning(false); return }
      const { repos } = await reposRes.json() as { repos: string[] }
      setAgents(repos.map(url => ({ repoUrl: url, repoName: repoShortName(url), status: 'pending', statusText: 'Waiting...', resourceCount: 0 })))
      await Promise.allSettled(repos.map(url => runAgent(url)))
    } finally {
      setIsRunning(false)
    }
  }

  function toggleCompare(resource: Resource) {
    setCompareList(prev => prev.find(r => r.id === resource.id) ? prev.filter(r => r.id !== resource.id) : prev.length >= 5 ? prev : [...prev, resource])
  }

  function toggleCategory(cat: string) {
    setOpenCategories(prev => { const n = new Set(prev); n.has(cat) ? n.delete(cat) : n.add(cat); return n })
  }

  function sortedResources(list: Resource[]): Resource[] {
    const filtered = filter ? list.filter(r =>
      r.name.toLowerCase().includes(filter.toLowerCase()) ||
      r.description.toLowerCase().includes(filter.toLowerCase()) ||
      r.tags.some(t => t.toLowerCase().includes(filter.toLowerCase()))
    ) : list
    return [...filtered].sort((a, b) =>
      sort === 'quality' ? b.score - a.score :
      sort === 'stars' ? (b.stars ?? -1) - (a.stars ?? -1) :
      a.name.localeCompare(b.name)
    )
  }

  function allFlat(): Resource[] { return Object.values(categoryMap).flatMap(Object.values).flat() }

  const totalCount = allFlat().length
  const runningCount = agents.filter(a => a.status === 'running').length
  const doneCount = agents.filter(a => a.status === 'done').length
  const compareWinner = compareList.length > 0 ? compareList.reduce((b, r) => r.score > b.score ? r : b, compareList[0]) : null

  const mono = "'JetBrains Mono', monospace"

  return (
    <div style={{ fontFamily: mono, background: '#0c0c0c', minHeight: '100vh', color: '#fff' }}>

      {/* HEADER */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: '#0c0c0c', borderBottom: '1px solid #1a1a1a', padding: '0 24px', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <span style={{ color: '#f97316', fontSize: 16 }}>★</span>
          <span style={{ fontWeight: 600 }}>awesome.dev</span>
          <span style={{ color: '#333' }}>/</span>
          <span style={{ color: '#555' }}>aggregator</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: '#555' }}>
          {isRunning && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f97316', display: 'inline-block', animation: 'pulse 1s infinite' }} />
              <span style={{ color: '#888' }}>running · {runningCount}/{agents.length} agents</span>
            </div>
          )}
          {totalCount > 0 && <span style={{ color: '#888' }}>{totalCount} resources</span>}
          {currentTopic && <span style={{ color: '#444' }}>{currentTopic}</span>}
        </div>
      </div>

      {/* SEARCH AREA */}
      <div style={{ padding: '48px 24px 32px', borderBottom: '1px solid #111', maxWidth: 860, margin: '0 auto' }}>
        <div style={{ fontSize: 11, color: '#f97316', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>// GitHub Awesome-* Aggregator</div>
        <h1 style={{ fontSize: 32, fontWeight: 300, letterSpacing: '-0.03em', margin: '0 0 8px', lineHeight: 1.2, fontFamily: mono }}>
          Find every <strong style={{ fontWeight: 700 }}>awesome</strong> resource,<br />unified in one place.
        </h1>
        <p style={{ fontSize: 13, color: '#555', margin: '0 0 28px', lineHeight: 1.7 }}>
          Enter a topic. AI finds the top repos. TinyFish agents scrape them in parallel and stream a deduplicated, scored directory.
        </p>
        <div style={{ display: 'flex', gap: 0, border: '1px solid #2a2a2a', borderRadius: 2, overflow: 'hidden', maxWidth: 640 }}>
          <span style={{ padding: '0 14px', background: '#111', color: '#f97316', fontSize: 12, display: 'flex', alignItems: 'center', borderRight: '1px solid #2a2a2a', whiteSpace: 'nowrap' }}>$ topic</span>
          <input value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAggregate()} placeholder="machine-learning, rust, devops, react..."
            style={{ flex: 1, padding: '12px 16px', background: '#0f0f0f', border: 'none', outline: 'none', color: '#fff', fontSize: 13, fontFamily: mono }} />
          <button onClick={handleAggregate} disabled={isRunning || !topic.trim()} style={{ padding: '12px 24px', background: isRunning ? '#1a1a1a' : '#f97316', color: isRunning ? '#555' : '#000', border: 'none', cursor: isRunning ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700, fontFamily: mono, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {isRunning ? 'Running...' : 'Aggregate'}
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
          {QUICK_TOPICS.map(t => (
            <button key={t} onClick={() => setTopic(t)} style={{ padding: '5px 12px', background: 'transparent', border: '1px solid #222', color: '#555', fontSize: 11, fontFamily: mono, cursor: 'pointer', borderRadius: 1 }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#f97316'; (e.currentTarget as HTMLButtonElement).style.color = '#f97316' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#222'; (e.currentTarget as HTMLButtonElement).style.color = '#555' }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* LOADING BAR */}
      {isRunning && (
        <div style={{ height: 2, background: '#111', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'linear-gradient(90deg, transparent, #f97316, #fb923c, #f97316, transparent)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
        </div>
      )}

      {/* MAIN LAYOUT */}
      {(agents.length > 0 || totalCount > 0) && (
        <div style={{ display: 'flex' }}>

          {/* SIDEBAR */}
          <div style={{ width: 280, flexShrink: 0, borderRight: '1px solid #1a1a1a', position: 'sticky', top: 48, height: 'calc(100vh - 48px)', overflowY: 'auto', padding: '20px 0' }}>

            <SidebarGroup label="// all">
              <SidebarItem label="All Resources" count={totalCount} active={view === 'all'} onClick={() => setView('all')} />
            </SidebarGroup>

            {Object.keys(categoryMap).length > 0 && (
              <>
                <SidebarDivider />
                <SidebarGroup label="// categories">
                  {Object.entries(categoryMap).map(([cat, subcats]) => (
                    <SidebarItem key={cat} label={cat} count={Object.values(subcats).flat().length} active={view === cat} onClick={() => setView(cat)} />
                  ))}
                </SidebarGroup>
              </>
            )}

            {agents.length > 0 && (
              <>
                <SidebarDivider />
                <SidebarGroup label="// sources">
                  {agents.map(a => (
                    <div key={a.repoUrl} style={{ padding: '6px 20px', fontSize: 11, color: a.status === 'done' ? '#444' : a.status === 'running' ? '#f97316' : '#2a2a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 210 }}>{a.repoName}</span>
                      <span style={{ flexShrink: 0 }}>{a.status === 'done' ? '✓' : a.status === 'running' ? '⟳' : a.status === 'error' ? '✗' : '·'}</span>
                    </div>
                  ))}
                </SidebarGroup>
              </>
            )}

            {totalCount > 0 && (
              <>
                <SidebarDivider />
                <SidebarGroup label="// quality">
                  {([['High (8–10)', (r: Resource) => r.score >= 8], ['Medium (5–7)', (r: Resource) => r.score >= 5 && r.score < 8], ['Low (<5)', (r: Resource) => r.score < 5]] as [string, (r: Resource) => boolean][]).map(([label, fn]) => {
                    const count = allFlat().filter(fn).length
                    return count > 0 ? <SidebarItem key={label} label={label} count={count} active={false} onClick={() => {}} /> : null
                  })}
                </SidebarGroup>
              </>
            )}
          </div>

          {/* CONTENT */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* Agent windows */}
            {agents.some(a => a.status !== 'pending') && (
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #111' }}>
                <div style={{ fontSize: 11, color: '#2a2a2a', letterSpacing: '0.08em', marginBottom: 12 }}>tinyfish agents</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
                  {agents.map(a => <AgentWindow key={a.repoUrl} agent={a} />)}
                </div>
              </div>
            )}

            {/* Toolbar */}
            {totalCount > 0 && (
              <div style={{ position: 'sticky', top: 48, zIndex: 50, background: '#0c0c0c', borderBottom: '1px solid #1a1a1a', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ fontSize: 12, color: '#555' }}>
                    <span style={{ color: '#fff' }}>{totalCount}</span> resources
                    {doneCount > 0 && <> · <span style={{ color: '#fff' }}>{doneCount}</span> repos</>}
                    {dupeCount > 0 && <> · <span style={{ color: '#f97316' }}>{dupeCount}</span> cross-refs</>}
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {(['quality', 'stars', 'az'] as SortMode[]).map(s => (
                      <button key={s} onClick={() => setSort(s)} style={{ padding: '4px 10px', fontSize: 11, background: sort === s ? '#1e1e1e' : 'transparent', border: `1px solid ${sort === s ? '#333' : '#1a1a1a'}`, color: sort === s ? '#fff' : '#555', cursor: 'pointer', fontFamily: mono, borderRadius: 1 }}>
                        {s === 'az' ? 'A–Z' : s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="filter..." style={{ padding: '5px 12px', background: '#111', border: '1px solid #1e1e1e', color: '#fff', fontSize: 12, fontFamily: mono, borderRadius: 1, outline: 'none', width: 160 }} />
                  <button onClick={() => exportJSON(allFlat())} style={exportBtnStyle}>↓ JSON</button>
                  <button onClick={() => exportCSV(allFlat())} style={exportBtnStyle}>↓ CSV</button>
                </div>
              </div>
            )}

            {/* Directory — All view */}
            {view === 'all' && Object.entries(categoryMap).map(([catName, subcats]) => {
              const allInCat = sortedResources(Object.values(subcats).flat())
              if (filter && allInCat.length === 0) return null
              const isOpen = openCategories.has(catName)
              return (
                <div key={catName}>
                  <div onClick={() => toggleCategory(catName)} style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', position: 'sticky', top: 89, background: '#0c0c0c', zIndex: 10, borderBottom: '1px solid #141414' }}>
                    <span style={{ color: '#333', fontSize: 11 }}>{isOpen ? '▼' : '▶'}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{catName}</span>
                    <span style={{ fontSize: 11, color: '#444', marginLeft: 4 }}>{allInCat.length}</span>
                  </div>
                  {isOpen && Object.entries(subcats).map(([subName, subResources]) => {
                    const sorted = sortedResources(subResources)
                    if (filter && sorted.length === 0) return null
                    return (
                      <div key={subName}>
                        {subName !== 'General' && <div style={{ padding: '8px 24px', fontSize: 11, color: '#444', borderBottom: '1px solid #0f0f0f', background: '#0a0a0a' }}>{subName} <span style={{ color: '#252525' }}>({sorted.length})</span></div>}
                        {sorted.map((r, i) => <ResourceRow key={r.id} resource={r} delay={i * 20} isComparing={!!compareList.find(c => c.id === r.id)} onCompare={() => toggleCompare(r)} />)}
                      </div>
                    )
                  })}
                </div>
              )
            })}

            {/* Directory — Category view */}
            {view !== 'all' && (
              <div>
                <div style={{ padding: '14px 24px', borderBottom: '1px solid #1a1a1a', background: '#0e0e0e', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ color: '#f97316', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}>// {view}</span>
                  <span style={{ color: '#555', fontSize: 12 }}>{Object.values(categoryMap[view] || {}).flat().length} resources</span>
                </div>
                {Object.entries(categoryMap[view] || {}).map(([subName, subResources]) => {
                  const sorted = sortedResources(subResources)
                  if (filter && sorted.length === 0) return null
                  return (
                    <div key={subName}>
                      {subName !== 'General' && <div style={{ padding: '8px 24px', fontSize: 11, color: '#444', borderBottom: '1px solid #0f0f0f', background: '#0a0a0a' }}>{subName} <span style={{ color: '#252525' }}>({sorted.length})</span></div>}
                      {sorted.map((r, i) => <ResourceRow key={r.id} resource={r} delay={i * 20} isComparing={!!compareList.find(c => c.id === r.id)} onCompare={() => toggleCompare(r)} />)}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Empty state */}
            {!isRunning && agents.length === 0 && totalCount === 0 && (
              <div style={{ padding: '80px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: '#1e1e1e', lineHeight: 1.8, marginBottom: 24, whiteSpace: 'pre' }}>{`┌─────────────────────────┐\n│  enter a topic above    │\n│  to start aggregating   │\n└─────────────────────────┘`}</div>
                <p style={{ fontSize: 13, color: '#333', fontFamily: 'Inter, sans-serif' }}>Parallel agents will scrape the top Awesome-* repos and stream results here.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state before any search */}
      {agents.length === 0 && totalCount === 0 && (
        <div style={{ padding: '80px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#1e1e1e', lineHeight: 1.8, marginBottom: 24, whiteSpace: 'pre' }}>{`┌─────────────────────────┐\n│  enter a topic above    │\n│  to start aggregating   │\n└─────────────────────────┘`}</div>
          <p style={{ fontSize: 13, color: '#333', fontFamily: 'Inter, sans-serif' }}>Parallel agents will scrape the top Awesome-* repos and stream results here.</p>
        </div>
      )}

      {/* COMPARE BAR */}
      {compareList.length > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200, background: '#111', borderTop: '1px solid #2a2a2a', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>Compare</span>
          <div style={{ display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap' }}>
            {compareList.map(r => (
              <div key={r.id} style={{ padding: '4px 10px', background: '#1a1a1a', border: '1px solid #2a2a2a', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, borderRadius: 1 }}>
                {r.name}
                <span onClick={() => toggleCompare(r)} style={{ color: '#555', cursor: 'pointer', fontSize: 10 }}>✕</span>
              </div>
            ))}
          </div>
          <button onClick={() => setShowDashboard(true)} style={{ padding: '8px 20px', background: '#f97316', color: '#000', border: 'none', fontSize: 12, fontWeight: 700, fontFamily: mono, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em', borderRadius: 1, flexShrink: 0 }}>
            Open Dashboard →
          </button>
        </div>
      )}

      {/* COMPARE DASHBOARD */}
      {showDashboard && compareList.length > 0 && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setShowDashboard(false)}>
          <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 2, width: '100%', maxWidth: 900, maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #1e1e1e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Compare Dashboard</span>
              <button onClick={() => setShowDashboard(false)} style={{ background: 'none', border: 'none', color: '#555', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>
            {compareWinner && (
              <div style={{ padding: '12px 24px', background: '#0f0f0f', borderBottom: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ color: '#f97316' }}>⚡</span>
                <span style={{ fontSize: 12 }}>
                  <strong style={{ color: '#f97316' }}>Best Match: {compareWinner.name}</strong>
                  <span style={{ color: '#555', marginLeft: 8 }}>— highest quality score ({compareWinner.score}/10)</span>
                </span>
              </div>
            )}
            <div style={{ padding: '0 24px', borderBottom: '1px solid #1e1e1e', display: 'flex' }}>
              {(['overview', 'details', 'crossrefs'] as const).map(tab => (
                <button key={tab} onClick={() => setDashboardTab(tab)} style={{ padding: '12px 16px', background: 'none', border: 'none', borderBottom: `2px solid ${dashboardTab === tab ? '#f97316' : 'transparent'}`, color: dashboardTab === tab ? '#fff' : '#555', fontSize: 12, cursor: 'pointer', fontFamily: mono, textTransform: 'capitalize' }}>{tab}</button>
              ))}
            </div>
            <div style={{ padding: 24, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    <td style={{ padding: '8px 12px', color: '#333', width: 100 }} />
                    {compareList.map(r => (
                      <th key={r.id} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 13, color: r.id === compareWinner?.id ? '#f97316' : '#fff', borderBottom: '1px solid #1e1e1e', background: r.id === compareWinner?.id ? 'rgba(249,115,22,0.05)' : 'transparent' }}>{r.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <CompareRow label="Score" winner={compareWinner} items={compareList} values={compareList.map(r => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ height: 4, background: '#1a1a1a', borderRadius: 2, width: 80 }}>
                        <div style={{ height: '100%', width: `${r.score * 10}%`, background: r.score >= 8 ? '#f97316' : '#555', borderRadius: 2 }} />
                      </div>
                      <span style={{ color: r.score >= 8 ? '#f97316' : '#888' }}>{r.score}/10</span>
                    </div>
                  ))} />
                  <CompareRow label="Stars" winner={compareWinner} items={compareList} values={compareList.map(r => r.starsDisplay)} />
                  {dashboardTab !== 'crossrefs' && <CompareRow label="Category" winner={compareWinner} items={compareList} values={compareList.map(r => r.category)} />}
                  {dashboardTab === 'overview' && <CompareRow label="Description" winner={compareWinner} items={compareList} values={compareList.map(r => <span style={{ color: '#888', lineHeight: 1.5, display: 'block' }}>{r.description || '—'}</span>)} />}
                  {dashboardTab === 'details' && <CompareRow label="Tags" winner={compareWinner} items={compareList} values={compareList.map(r => <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{r.tags.map(t => <span key={t} style={{ padding: '2px 6px', background: '#1a1a1a', border: '1px solid #2a2a2a', fontSize: 10, borderRadius: 1 }}>{t}</span>)}</div>)} />}
                  {dashboardTab === 'crossrefs' && <CompareRow label="Cross-refs" winner={compareWinner} items={compareList} values={compareList.map(r => r.crossRefs.length > 0 ? <div>{r.crossRefs.map(ref => <div key={ref} style={{ color: '#888' }}>→ {ref}</div>)}</div> : <span style={{ color: '#333' }}>none</span>)} />}
                  <CompareRow label="Source" winner={compareWinner} items={compareList} values={compareList.map(r => <span style={{ color: '#555' }}>{r.sourceRepo}</span>)} />
                  <tr>
                    <td style={{ padding: '12px 12px', color: '#333' }} />
                    {compareList.map(r => (
                      <td key={r.id} style={{ padding: '12px 12px', background: r.id === compareWinner?.id ? 'rgba(249,115,22,0.05)' : 'transparent' }}>
                        <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ padding: '7px 16px', background: r.id === compareWinner?.id ? '#f97316' : 'transparent', color: r.id === compareWinner?.id ? '#000' : '#555', border: `1px solid ${r.id === compareWinner?.id ? '#f97316' : '#2a2a2a'}`, fontSize: 11, textDecoration: 'none', fontFamily: mono, display: 'inline-block', letterSpacing: '0.06em' }}>Visit ↗</a>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


    </div>
  )
}

// ── Sub-components ──

function SidebarGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ padding: '4px 20px', fontSize: 10, color: '#2a2a2a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>{label}</div>
      {children}
    </div>
  )
}

function SidebarDivider() {
  return <div style={{ height: 1, background: '#141414', margin: '12px 0' }} />
}

function SidebarItem({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ padding: '7px 20px', fontSize: 12, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: active ? '#fff' : hovered ? '#999' : '#666', background: active ? '#111' : 'transparent', borderLeft: `2px solid ${active ? '#f97316' : 'transparent'}`, transition: 'all 0.1s' }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 210 }}>{label}</span>
      <span style={{ fontSize: 10, color: active ? '#555' : '#2a2a2a', flexShrink: 0, marginLeft: 8 }}>{count}</span>
    </div>
  )
}

function AgentWindow({ agent }: { agent: AgentState }) {
  const isRunning = agent.status === 'running'
  const isDone = agent.status === 'done'
  const isError = agent.status === 'error'
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (isDone) {
      const t = setTimeout(() => setVisible(false), 2500)
      return () => clearTimeout(t)
    }
  }, [isDone])

  if (!visible) return null

  return (
    <div style={{ border: `1px solid ${isRunning ? '#2a1a0a' : isError ? '#2a1010' : '#141414'}`, borderRadius: 2, overflow: 'hidden', opacity: isDone ? 0 : 1, transition: 'opacity 2s ease', }}>
      <div style={{ padding: '6px 10px', background: isRunning ? '#130f0a' : '#0f0f0f', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #1a1a1a' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: isRunning && i === 0 ? '#f97316' : '#1e1e1e' }} />)}
        </div>
        <span style={{ fontSize: 10, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agent.repoName}</span>
      </div>
      <div style={{ padding: 10, background: '#0c0c0c' }}>
        {isRunning && (
          <div style={{ height: 2, background: '#1a1a1a', borderRadius: 1, marginBottom: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg, transparent, #f97316, transparent)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
          </div>
        )}
        <div style={{ fontSize: 11, color: isDone ? '#2a2a2a' : isError ? '#f44336' : '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agent.statusText}</div>
        {agent.resourceCount > 0 && <div style={{ fontSize: 10, color: '#2a2a2a', marginTop: 3 }}>{agent.resourceCount} resources found</div>}
      </div>
    </div>
  )
}

function ResourceRow({ resource, delay, isComparing, onCompare }: { resource: Resource; delay: number; isComparing: boolean; onCompare: () => void }) {
  const [hovered, setHovered] = useState(false)
  const scoreColor = resource.score >= 8 ? '#f97316' : resource.score >= 5 ? '#777' : '#444'
  const mono = "'JetBrains Mono', monospace"
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ padding: '12px 24px', borderBottom: '1px solid #0f0f0f', display: 'flex', alignItems: 'flex-start', gap: 16, justifyContent: 'space-between', background: hovered ? '#0f0f0f' : 'transparent', transition: 'background 0.1s' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <a href={resource.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 600, color: '#fff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {resource.name} <span style={{ color: '#2a2a2a', fontSize: 11 }}>↗</span>
        </a>
        {resource.description && <div style={{ fontSize: 12, color: '#555', marginTop: 3, lineHeight: 1.5 }}>{resource.description}</div>}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 6 }}>
          {resource.tags.slice(0, 4).map(t => <span key={t} style={{ padding: '2px 6px', background: '#111', border: '1px solid #1a1a1a', fontSize: 10, borderRadius: 1, color: '#444' }}>{t}</span>)}
          {resource.starsDisplay !== '—' && <span style={{ fontSize: 11, color: '#333' }}>★ {resource.starsDisplay}</span>}
          <span style={{ fontSize: 10, color: '#222', padding: '2px 6px', border: '1px solid #181818', borderRadius: 1 }}>{resource.sourceRepo}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: scoreColor }}>{resource.score}/10</span>
          {resource.crossRefs.map(ref => <span key={ref} style={{ fontSize: 10, color: '#333' }}>→ {ref}</span>)}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginTop: 2 }}>
        <button onClick={onCompare} style={{ padding: '4px 10px', fontSize: 10, background: isComparing ? '#1a0f00' : 'transparent', border: `1px solid ${isComparing ? '#f97316' : '#1a1a1a'}`, color: isComparing ? '#f97316' : '#333', cursor: 'pointer', fontFamily: mono, borderRadius: 1 }}>
          {isComparing ? '✓ compare' : 'compare'}
        </button>
        <button onClick={() => navigator.clipboard?.writeText(resource.url)} style={{ padding: '4px 10px', fontSize: 10, background: 'transparent', border: '1px solid #1a1a1a', color: '#333', cursor: 'pointer', fontFamily: mono, borderRadius: 1 }}>
          copy
        </button>
      </div>
    </div>
  )
}

function CompareRow({ label, values, winner, items }: { label: string; values: React.ReactNode[]; winner: Resource | null; items: Resource[] }) {
  return (
    <tr style={{ borderBottom: '1px solid #141414' }}>
      <td style={{ padding: '10px 12px', color: '#333', fontSize: 11, verticalAlign: 'top', whiteSpace: 'nowrap' }}>{label}</td>
      {items.map((r, i) => (
        <td key={r.id} style={{ padding: '10px 12px', fontSize: 12, verticalAlign: 'top', background: r.id === winner?.id ? 'rgba(249,115,22,0.04)' : 'transparent' }}>
          {values[i]}
        </td>
      ))}
    </tr>
  )
}

const exportBtnStyle: React.CSSProperties = { padding: '5px 12px', background: 'transparent', border: '1px solid #1e1e1e', color: '#555', fontSize: 11, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", borderRadius: 1 }
