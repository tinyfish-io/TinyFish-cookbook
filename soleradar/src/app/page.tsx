'use client'

import { useState, useRef, useCallback } from 'react'
import type { SneakerDrop, AgentState, SearchParams } from '@/lib/types'

// ─── helpers ────────────────────────────────────────────────────────────────

function buildGoal(p: SearchParams, currency: string): string {
  return `TASK: Extract ${p.sneakerName} of colour ${p.colorway} of size ${p.size}.
SPEED: You must complete this task as fast as possible. Do not wait, do not explore, do not browse around. Go directly to the product. If a search bar is available, use it immediately. Extract and return — do not waste time.
RULES:
1) Focus only on the user-specified sneaker(s) and variants (size, color, region).
2) Stay on the page. Do not click unrelated links. If the product is not on this page after one search, return empty — do not keep browsing.
3) Open pages fully to read dynamic content (stock status, "coming soon," price, sizes).
4) Avoid unnecessary navigation; be fast and efficient. For the colourway, colours are separated by commas and if there is something like "Red and Black" that means a shoe with both red and black colours. In the purchase link, put the direct link to the product page.
5) If a page has multiple products, only extract information relevant to the selected sneaker model and size.
6) Display all prices in ${currency}.
7) If the product is not found after a direct search, immediately return an empty sneakerDrops array. Do not keep trying.
RETURN JSON:
{
  "sneakerDrops": [
    {
      "Sneaker Name": "",
      "Brand": "",
      "Size": "",
      "Colorway": "",
      "Region / Country": "${p.region}",
      "Stock Status": "",
      "Price": "",
      "Release Time / Restock Time": "",
      "Website": "",
      "Purchase Link": "",
      "Notes": ""
    }
  ]
}`
}

function scoreResult(drop: SneakerDrop): number {
  let s = 5
  const stock = (drop['Stock Status'] || '').toLowerCase()
  if (stock.includes('in stock') || stock.includes('available')) s += 3
  else if (stock.includes('low') || stock.includes('few')) s += 1
  else if (stock.includes('out') || stock.includes('coming soon')) s -= 2
  if (drop['Price'] && drop['Price'] !== '' && drop['Price'] !== 'N/A') s += 1
  if (drop['Purchase Link'] && drop['Purchase Link'].startsWith('http')) s += 1
  return Math.min(10, Math.max(1, s))
}

function extractDrops(raw: unknown): SneakerDrop[] {
  if (!raw) return []

  // Handle string — try to parse it
  if (typeof raw === 'string') {
    try {
      const clean = raw.replace(/```json|```/g, '').trim()
      raw = JSON.parse(clean)
    } catch { return [] }
  }

  const obj = raw as Record<string, unknown>
  let drops: unknown[] = []

  if (Array.isArray(obj)) {
    drops = obj
  } else if (Array.isArray(obj.sneakerDrops)) {
    drops = obj.sneakerDrops as unknown[]
  } else if (obj.resultJson) {
    // TinyFish COMPLETE event: { resultJson: { sneakerDrops: [...] } }
    const rj = obj.resultJson as Record<string, unknown>
    if (Array.isArray(rj.sneakerDrops)) drops = rj.sneakerDrops as unknown[]
    else if (Array.isArray(rj)) drops = rj as unknown[]
    else {
      // resultJson might itself be a string
      if (typeof rj === 'string') {
        try {
          const p = JSON.parse((rj as unknown as string).replace(/```json|```/g, '').trim())
          if (Array.isArray(p)) drops = p
          else if (Array.isArray(p.sneakerDrops)) drops = p.sneakerDrops as unknown[]
        } catch { /* empty */ }
      }
    }
  } else if (obj.payload) {
    // Our own wrapper: { type: 'done', payload: <TinyFish COMPLETE event> }
    return extractDrops(obj.payload)
  } else if (Array.isArray(obj.result)) {
    drops = obj.result as unknown[]
  } else if (typeof obj.result === 'string') {
    try {
      const p = JSON.parse((obj.result as string).replace(/```json|```/g, '').trim())
      if (Array.isArray(p)) drops = p
      else if (Array.isArray(p.sneakerDrops)) drops = p.sneakerDrops as unknown[]
    } catch { return [] }
  } else if (typeof obj.output === 'string') {
    try {
      const p = JSON.parse((obj.output as string).replace(/```json|```/g, '').trim())
      if (Array.isArray(p)) drops = p
      else if (Array.isArray(p.sneakerDrops)) drops = p.sneakerDrops as unknown[]
    } catch { return [] }
  }

  return (drops as SneakerDrop[]).filter((d) => d && typeof d === 'object')
}

const CURRENCY_OPTIONS = [
  { code: 'SGD', symbol: 'S$', label: 'SGD — Singapore Dollar' },
  { code: 'USD', symbol: '$',  label: 'USD — US Dollar' },
  { code: 'GBP', symbol: '£',  label: 'GBP — British Pound' },
  { code: 'JPY', symbol: '¥',  label: 'JPY — Japanese Yen' },
  { code: 'AUD', symbol: 'A$', label: 'AUD — Australian Dollar' },
  { code: 'EUR', symbol: '€',  label: 'EUR — Euro' },
  { code: 'CAD', symbol: 'C$', label: 'CAD — Canadian Dollar' },
  { code: 'INR', symbol: '₹',  label: 'INR — Indian Rupee' },
]

const REGION_OPTIONS = [
  '🇸🇬 Singapore',
  '🇺🇸 United States',
  '🇬🇧 United Kingdom',
  '🇯🇵 Japan',
  '🇦🇺 Australia',
  '🇩🇪 Germany',
  '🇨🇦 Canada',
  '🇫🇷 France',
  '🇮🇳 India',
]

// ─── components ─────────────────────────────────────────────────────────────

function AgentWindow({ agent }: { agent: AgentState }) {
  const isDone = agent.status === 'done'
  const isError = agent.status === 'error'
  const isRunning = agent.status === 'running' || agent.status === 'pending'

  return (
    <div style={{
      border: `1px solid ${isError ? '#FF2E2E' : isRunning ? '#FFE600' : '#2a2a2a'}`,
      background: '#0f0f0f',
      padding: '12px',
      position: 'relative',
      overflow: 'hidden',
      animation: isRunning ? 'agentGlow 2s ease-in-out infinite' : 'none',
      opacity: isDone ? 0.45 : 1,
      transition: 'opacity 1.5s ease',
    }}>
      {/* progress bar */}
      <div style={{ height: '2px', background: '#1a1a1a', marginBottom: '10px', overflow: 'hidden' }}>
        {isRunning && (
          <div style={{
            height: '100%',
            background: 'linear-gradient(90deg, #FFE600, #FF6B00)',
            animation: 'barSweep 1.5s ease-in-out infinite',
          }} />
        )}
        {isDone && <div style={{ height: '100%', background: '#2a2a2a', width: '100%' }} />}
      </div>

      {/* live dot */}
      <div style={{
        position: 'absolute', top: 12, right: 12,
        width: 7, height: 7, borderRadius: '50%',
        background: isError ? '#FF2E2E' : isRunning ? '#FFE600' : '#333',
        animation: isRunning ? 'pulse 1s infinite' : 'none',
      }} />

      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 12, fontWeight: 700, letterSpacing: 2,
        textTransform: 'uppercase', color: '#f5f0e8', marginBottom: 4,
      }}>{agent.site}</div>
      <div style={{ fontSize: 11, color: '#444', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {agent.status === 'pending' ? 'Queued...' :
         agent.status === 'error' ? '✕ Error' :
         isDone ? `✓ ${agent.results.length} result${agent.results.length !== 1 ? 's' : ''} found` :
         agent.statusMsg || 'Connecting...'}
      </div>
    </div>
  )
}

function ProductCard({
  drop,
  selected,
  onToggleCompare,
  currencySymbol,
}: {
  drop: SneakerDrop
  selected: boolean
  onToggleCompare: () => void
  currencySymbol: string
}) {
  const score = drop._qualityScore ?? scoreResult(drop)
  const stock = (drop['Stock Status'] || '').toLowerCase()
  const inStock = stock.includes('in stock') || stock.includes('available')
  const low = stock.includes('low') || stock.includes('few') || stock.includes('limited')
  const purchaseLink = drop['Purchase Link']
  const hasLink = purchaseLink && purchaseLink.startsWith('http')

  return (
    <div style={{
      background: '#0f0f0f',
      border: `1px solid ${selected ? '#FFE600' : '#1a1a1a'}`,
      position: 'relative',
      overflow: 'hidden',
      transition: 'transform 0.2s, border-color 0.2s',
      animation: 'fadeIn 0.4s ease',
      cursor: 'crosshair',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#FFE600'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = selected ? '#FFE600' : '#1a1a1a'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}
    >
      {selected && (
        <div style={{
          position: 'absolute', top: 10, right: 10,
          background: '#FFE600', color: '#0a0a0a',
          width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, fontSize: 12, zIndex: 2,
        }}>✓</div>
      )}

      {/* image placeholder */}
      <div style={{
        height: 150, background: '#141414',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 64, position: 'relative',
      }}>
        👟
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, transparent 50%, #0f0f0f 100%)',
        }} />
        <div style={{
          position: 'absolute', top: 10, left: 10,
          background: '#0a0a0a', border: '1px solid #2a2a2a',
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 9, fontWeight: 700, letterSpacing: 2,
          textTransform: 'uppercase', color: '#444', padding: '3px 8px',
        }}>{drop['Website'] || drop._agentSite || '—'}</div>
      </div>

      <div style={{ padding: 14 }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 15, fontWeight: 700, letterSpacing: 1,
          textTransform: 'uppercase', color: '#f5f0e8',
          marginBottom: 2, lineHeight: 1.2,
        }}>{drop['Sneaker Name'] || '—'}</div>
        <div style={{ fontSize: 11, color: '#444', marginBottom: 10 }}>
          {drop['Colorway'] || '—'} {drop['Brand'] ? `· ${drop['Brand']}` : ''}
        </div>

        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 28, color: '#FFE600', lineHeight: 1,
        }}>
          {drop['Price'] && drop['Price'] !== 'N/A' && drop['Price'] !== '' ? drop['Price'] : '—'}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 11, fontWeight: 700, letterSpacing: 2,
            color: '#444', textTransform: 'uppercase',
          }}>SIZE {drop['Size'] || '—'}</span>
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: low ? '#FF6B00' : inStock ? '#4ade80' : '#666',
          }}>
            {low ? '⚠ Low Stock' : inStock ? '✓ In Stock' : drop['Stock Status'] || '—'}
          </span>
        </div>

        {/* quality score bar */}
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 2, color: '#333', textTransform: 'uppercase' }}>Quality</span>
            <span style={{ fontSize: 9, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1, color: '#FFE600', fontWeight: 700 }}>{score}/10</span>
          </div>
          <div style={{ height: 2, background: '#1a1a1a' }}>
            <div style={{ height: '100%', background: '#FFE600', width: `${score * 10}%`, transition: 'width 0.5s ease' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 1, marginTop: 12 }}>
          <a
            href={hasLink ? purchaseLink : '#'}
            target={hasLink ? '_blank' : undefined}
            rel="noopener noreferrer"
            onClick={!hasLink ? (e) => e.preventDefault() : undefined}
            style={{
              flex: 1,
              background: hasLink ? '#FFE600' : '#2a2a2a',
              color: hasLink ? '#0a0a0a' : '#444',
              border: 'none',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 11, fontWeight: 900, letterSpacing: 3,
              textTransform: 'uppercase',
              padding: '10px',
              cursor: hasLink ? 'crosshair' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              textDecoration: 'none',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (hasLink) (e.currentTarget as HTMLAnchorElement).style.background = '#f5f0e8' }}
            onMouseLeave={e => { if (hasLink) (e.currentTarget as HTMLAnchorElement).style.background = '#FFE600' }}
          >
            {hasLink ? 'View Deal →' : 'No Link'}
          </a>
          <button
            onClick={onToggleCompare}
            style={{
              background: selected ? '#FFE600' : '#1a1a1a',
              color: selected ? '#0a0a0a' : '#444',
              border: 'none',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 11, fontWeight: 700, letterSpacing: 2,
              textTransform: 'uppercase',
              padding: '10px 14px',
              cursor: 'crosshair',
              transition: 'all 0.15s',
            }}
          >
            {selected ? '✓' : '+ Cmp'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CompareDashboard({
  items,
  onClose,
}: {
  items: SneakerDrop[]
  onClose: () => void
}) {
  if (items.length === 0) return null

  const scored = items.map(d => ({ ...d, _qualityScore: scoreResult(d) }))
  const best = scored.reduce((a, b) => ((a._qualityScore ?? 0) >= (b._qualityScore ?? 0) ? a : b))

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.93)',
        zIndex: 200, display: 'flex', alignItems: 'flex-start',
        justifyContent: 'center', padding: '40px 20px', overflowY: 'auto',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', width: '100%', maxWidth: 1100, position: 'relative' }}>
        {/* header */}
        <div style={{
          padding: '24px 32px', borderBottom: '1px solid #222',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, letterSpacing: 3, color: '#f5f0e8' }}>
            COMPARE <span style={{ color: '#FFE600' }}>DASHBOARD</span>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: '1px solid #2a2a2a', color: '#444',
            width: 36, height: 36, cursor: 'crosshair', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        {/* best pick */}
        <div style={{ background: '#FFE600', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, letterSpacing: 4,
            background: '#0a0a0a', color: '#FFE600', padding: '4px 12px',
          }}>BEST PICK</div>
          <div>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 18, fontWeight: 900, color: '#0a0a0a',
              textTransform: 'uppercase', letterSpacing: 1,
            }}>{best['Website']} — {best['Sneaker Name']}</div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)', marginTop: 2 }}>
              Quality score {best._qualityScore}/10 · {best['Stock Status']} · {best['Price']}
            </div>
          </div>
        </div>

        {/* table */}
        <div style={{ padding: '24px 32px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: '#444', padding: '8px 16px', borderBottom: '1px solid #222', width: 130 }}></th>
                {scored.map((d, i) => (
                  <th key={i} style={{
                    textAlign: 'left',
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 11, fontWeight: 700, letterSpacing: 3,
                    textTransform: 'uppercase',
                    color: d === best ? '#FFE600' : '#444',
                    padding: '8px 16px', borderBottom: '1px solid #222',
                  }}>
                    {d['Website'] || d._agentSite || `Option ${i + 1}`}
                    {d === best && ' ★'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Price', render: (d: SneakerDrop) => <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: '#FFE600' }}>{d['Price'] || '—'}</span> },
                { label: 'Size', render: (d: SneakerDrop) => d['Size'] || '—' },
                { label: 'Stock', render: (d: SneakerDrop) => {
                  const s = (d['Stock Status'] || '').toLowerCase()
                  const c = s.includes('in stock') || s.includes('available') ? '#4ade80' : s.includes('low') ? '#FF6B00' : '#666'
                  return <span style={{ color: c }}>{d['Stock Status'] || '—'}</span>
                }},
                { label: 'Colorway', render: (d: SneakerDrop) => d['Colorway'] || '—' },
                { label: 'Region', render: (d: SneakerDrop) => d['Region / Country'] || '—' },
                { label: 'Release', render: (d: SneakerDrop) => d['Release Time / Restock Time'] || '—' },
                { label: 'Quality', render: (d: SneakerDrop) => {
                  const sc = d._qualityScore ?? 5
                  return (
                    <div>
                      <span style={{ color: '#FFE600', fontWeight: 700 }}>{sc}/10</span>
                      <div style={{ height: 3, background: '#111', marginTop: 4, width: 120 }}>
                        <div style={{ height: '100%', background: '#FFE600', width: `${sc * 10}%` }} />
                      </div>
                    </div>
                  )
                }},
                { label: 'Notes', render: (d: SneakerDrop) => <span style={{ fontSize: 12, color: '#444' }}>{d['Notes'] || '—'}</span> },
                { label: 'Action', render: (d: SneakerDrop) => {
                  const link = d['Purchase Link']
                  const has = link && link.startsWith('http')
                  return (
                    <a href={has ? link : '#'} target={has ? '_blank' : undefined} rel="noopener noreferrer"
                      onClick={!has ? (e) => e.preventDefault() : undefined}
                      style={{
                        background: has ? '#FFE600' : '#1a1a1a',
                        color: has ? '#0a0a0a' : '#444',
                        border: 'none',
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontSize: 11, fontWeight: 900, letterSpacing: 3,
                        textTransform: 'uppercase',
                        padding: '8px 16px', cursor: has ? 'crosshair' : 'not-allowed',
                        textDecoration: 'none', display: 'inline-block',
                      }}>
                      {has ? `Visit ${d['Website']} →` : 'No Link'}
                    </a>
                  )
                }},
              ].map((row) => (
                <tr key={row.label} style={{ borderBottom: '1px solid #1a1a1a' }}>
                  <td style={{
                    padding: '14px 16px',
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 11, fontWeight: 700, letterSpacing: 3,
                    textTransform: 'uppercase', color: '#333',
                    verticalAlign: 'top',
                  }}>{row.label}</td>
                  {scored.map((d, i) => (
                    <td key={i} style={{
                      padding: '14px 16px',
                      fontSize: 13, color: '#888',
                      verticalAlign: 'top',
                      background: d === best ? 'rgba(255,230,0,0.03)' : 'transparent',
                    }}>
                      {row.render(d)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function Home() {
  const [sneakerName, setSneakerName] = useState('')
  const [size, setSize] = useState('')
  const [colorway, setColorway] = useState('')
  const [region, setRegion] = useState('🇸🇬 Singapore')
  const [currency, setCurrency] = useState('SGD')

  const [agents, setAgents] = useState<AgentState[]>([])
  const [allDrops, setAllDrops] = useState<SneakerDrop[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)

  const [filterSite, setFilterSite] = useState('All')
  const [filterStock, setFilterStock] = useState('All')
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'quality' | 'newest'>('quality')

  const [compareItems, setCompareItems] = useState<SneakerDrop[]>([])
  const [showDashboard, setShowDashboard] = useState(false)
  const [compareError, setCompareError] = useState(false)

  const abortRef = useRef<AbortController | null>(null)

  const currencySymbol = CURRENCY_OPTIONS.find(c => c.code === currency)?.symbol || '$'

  const runAgent = useCallback(async (site: { name: string; url: string }, goal: string, idx: number) => {
    const updateAgent = (patch: Partial<AgentState>) => {
      setAgents(prev => prev.map((a, i) => i === idx ? { ...a, ...patch } : a))
    }

    updateAgent({ status: 'running', startedAt: Date.now() })

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: site.url, goal }),
        signal: abortRef.current?.signal,
      })

      if (!res.ok || !res.body) {
        updateAgent({ status: 'error', statusMsg: 'Failed to connect' })
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let finalResults: SneakerDrop[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data:')) continue

          const dataStr = trimmed.slice(5).trim()
          try {
            const parsed = JSON.parse(dataStr)

            // stream_end = stream closed naturally, just finish with what we have
            if (parsed.type === 'stream_end') {
              break
            }

            // error from our proxy — log the status but keep going, don't mark as error
            // (TinyFish sometimes sends error-like messages mid-stream that aren't fatal)
            if (parsed.type === 'error') {
              updateAgent({ statusMsg: `Note: ${(parsed.message || 'unknown').slice(0, 60)}` })
              break
            }

            // Our done wrapper — TinyFish COMPLETE payload
            if (parsed.type === 'done') {
              if (parsed.payload) {
                const drops = extractDrops(parsed.payload)
                if (drops.length > 0) {
                  finalResults = drops.map(d => ({ ...d, _agentSite: site.name, _qualityScore: scoreResult(d) }))
                }
              }
              break
            }

            // TinyFish native event types
            const tfType = (parsed.type || '').toUpperCase()

            if (tfType === 'STARTED') {
              updateAgent({ statusMsg: 'Agent started...' })
            }

            if (tfType === 'HEARTBEAT') {
              // keep-alive ping from TinyFish — ignore, just means it's still running
            }

            if (tfType === 'PROGRESS' && parsed.purpose) {
              updateAgent({ statusMsg: String(parsed.purpose).slice(0, 80) })
            }

            if (tfType === 'COMPLETE' || parsed.resultJson !== undefined) {
              const drops = extractDrops(parsed)
              if (drops.length > 0) {
                finalResults = drops.map(d => ({ ...d, _agentSite: site.name, _qualityScore: scoreResult(d) }))
              }
              break
            }

          } catch {
            // plain text status message — just show it, keep running
            if (dataStr && dataStr.length < 200 && !dataStr.startsWith('{')) {
              updateAgent({ statusMsg: dataStr.slice(0, 80) })
            }
          }
        }
      }

      // Filter out empty or "not found" results
      const validResults = finalResults.filter(d => {
        const name = (d['Sneaker Name'] || '').toLowerCase().trim()
        const price = (d['Price'] || '').trim()
        const link = (d['Purchase Link'] || '').trim()
        const stock = (d['Stock Status'] || '').toLowerCase()
        // Skip if no name, or explicitly says not found
        if (!name || name === 'n/a' || name === 'not found' || name === '—' || name === '-') return false
        // Skip if no price AND no link (truly empty result)
        if (!price && !link) return false
        // Skip if stock explicitly says not found / not available with no link
        if ((stock.includes('not found') || stock.includes('not available')) && !link) return false
        return true
      })
      updateAgent({ status: 'done', results: validResults })
      if (validResults.length > 0) {
        setAllDrops(prev => [...prev, ...validResults])
      }

    } catch (err: unknown) {
      // AbortError = user triggered new search, silently stop
      if (err instanceof Error && err.name === 'AbortError') return
      // Any other error (network drop, timeout) — mark done with whatever was found
      // Never show "error" to the user for a long-running search that just closed
      updateAgent({ status: 'done', results: [] })
    }
  }, [])

  const handleSearch = async () => {
    if (!sneakerName.trim()) return

    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setAllDrops([])
    setAgents([])
    setSearching(true)
    setSearched(true)
    setFilterSite('All')
    setCompareItems([])

    // Fetch sites for region
    const sitesRes = await fetch(`/api/find-sites?region=${encodeURIComponent(region)}&sneaker=${encodeURIComponent(sneakerName)}`)
    const sitesData = await sitesRes.json()
    const sites: { name: string; url: string }[] = sitesData.sites || []

    const initialAgents: AgentState[] = sites.map(s => ({
      site: s.name, url: s.url, status: 'running',
      statusMsg: 'Connecting...', results: [],
    }))
    setAgents(initialAgents)

    const params: SearchParams = { sneakerName, size, colorway, region, currency }
    const goal = buildGoal(params, currency)

    // Launch all agents in parallel
    await Promise.allSettled(sites.map((site, idx) => runAgent(site, goal, idx)))
    setSearching(false)
  }

  // ─── filtering & sorting ──────────────────────────────────────────────────

  const sitesInResults = ['All', ...Array.from(new Set(allDrops.map(d => d['Website'] || d._agentSite || 'Unknown')))]

  let displayDrops = [...allDrops]
  if (filterSite !== 'All') displayDrops = displayDrops.filter(d => (d['Website'] || d._agentSite) === filterSite)
  if (filterStock !== 'All') {
    displayDrops = displayDrops.filter(d => {
      const s = (d['Stock Status'] || '').toLowerCase()
      if (filterStock === 'In Stock') return s.includes('in stock') || s.includes('available')
      if (filterStock === 'Low Stock') return s.includes('low') || s.includes('few') || s.includes('limited')
      if (filterStock === 'Pre-Order') return s.includes('pre') || s.includes('coming')
      return true
    })
  }

  if (sortBy === 'price-asc') {
    displayDrops.sort((a, b) => {
      const pa = parseFloat((a['Price'] || '0').replace(/[^0-9.]/g, '')) || 0
      const pb = parseFloat((b['Price'] || '0').replace(/[^0-9.]/g, '')) || 0
      return pa - pb
    })
  } else if (sortBy === 'price-desc') {
    displayDrops.sort((a, b) => {
      const pa = parseFloat((a['Price'] || '0').replace(/[^0-9.]/g, '')) || 0
      const pb = parseFloat((b['Price'] || '0').replace(/[^0-9.]/g, '')) || 0
      return pb - pa
    })
  } else if (sortBy === 'quality') {
    displayDrops.sort((a, b) => (b._qualityScore ?? 0) - (a._qualityScore ?? 0))
  }

  const activeAgents = agents.filter(a => a.status === 'running' || a.status === 'pending').length
  const lowestPrice = allDrops.reduce((min, d) => {
    const p = parseFloat((d['Price'] || '').replace(/[^0-9.]/g, ''))
    return (!isNaN(p) && p < min) ? p : min
  }, Infinity)

  const toggleCompare = (drop: SneakerDrop) => {
    setCompareError(false)
    setCompareItems(prev => {
      const exists = prev.some(d => d['Purchase Link'] === drop['Purchase Link'] && d['Website'] === drop['Website'])
      if (exists) return prev.filter(d => !(d['Purchase Link'] === drop['Purchase Link'] && d['Website'] === drop['Website']))
      if (prev.length >= 5) return prev
      return [...prev, drop]
    })
  }

  const isSelected = (drop: SneakerDrop) =>
    compareItems.some(d => d['Purchase Link'] === drop['Purchase Link'] && d['Website'] === drop['Website'])

  // ─── render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh' }} suppressHydrationWarning>
      {/* Floating shoes */}
      {['5%', '35%', 'calc(100% - 200px)', '65%', '-5%'].map((top, i) => (
        <div key={i} style={{
          position: 'fixed', pointerEvents: 'none', zIndex: 1,
          opacity: i === 2 ? 0.04 : 0.07,
          fontSize: [140, 90, 160, 80, 110][i],
          top, left: ['-5%', undefined, '10%', undefined, undefined][i] || 'auto',
          right: [undefined, '-3%', undefined, '8%', '25%'][i] || 'auto',
          animation: `floatShoe ${[22, 28, 18, 32, 25][i]}s ease-in-out infinite`,
          animationDelay: `${[0, -8, -14, -3, -19][i]}s`,
          transform: i === 1 ? 'scaleX(-1)' : i === 4 ? 'rotate(-20deg)' : 'none',
        }}>👟</div>
      ))}

      {/* Header */}
      <header style={{
        position: 'relative', zIndex: 10, padding: '20px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid #1e1e1e',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <div style={{
            width: 10, height: 10, background: '#FFE600', borderRadius: '50%',
            marginBottom: 6, animation: 'pulse 1.5s ease-in-out infinite',
          }} />
          <span style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 42, letterSpacing: 3, color: '#f5f0e8', lineHeight: 1,
          }}>SOLERADAR</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {searching && (
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 11, fontWeight: 700, letterSpacing: 3,
              textTransform: 'uppercase', color: '#FFE600',
              border: '1px solid #FFE600', padding: '6px 12px',
              animation: 'pulse 1s infinite',
            }}>
              ● {activeAgents} AGENTS ACTIVE
            </span>
          )}
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 11, fontWeight: 700, letterSpacing: 3,
            textTransform: 'uppercase', color: '#2a2a2a',
            border: '1px solid #1e1e1e', padding: '6px 12px',
          }}>POWERED BY TINYFISH</span>
        </div>
      </header>

      {/* Hero */}
      <div style={{ position: 'relative', zIndex: 10, padding: '80px 40px 60px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{
          display: 'inline-block', background: '#FFE600', color: '#0a0a0a',
          fontFamily: "'Bebas Neue', sans-serif", fontSize: 13, letterSpacing: 4,
          padding: '5px 14px', transform: 'rotate(-1deg)', marginBottom: 24,
        }}>GLOBAL SNEAKER INTELLIGENCE</div>

        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", lineHeight: 0.9, letterSpacing: 2, textTransform: 'uppercase' }}>
          <span style={{ display: 'block', fontSize: 'clamp(80px, 12vw, 160px)', color: '#f5f0e8' }}>FIND YOUR</span>
          <span style={{ display: 'block', fontSize: 'clamp(70px, 11vw, 140px)', color: 'transparent', WebkitTextStroke: '2px #FFE600' }}>GRAIL</span>
          <span style={{ display: 'block', fontSize: 'clamp(40px, 6vw, 80px)', color: '#FFE600', letterSpacing: 8 }}>ANYWHERE</span>
        </h1>

        <p style={{ marginTop: 24, fontSize: 14, color: '#444', letterSpacing: 1, maxWidth: 420, lineHeight: 1.7 }}>
          Enter any sneaker. <span style={{ color: '#f5f0e8', fontWeight: 600 }}>SoleRadar</span> deploys AI agents across 7+ retailers in your region — simultaneously — and surfaces every deal, size, and colorway in real-time.
        </p>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', zIndex: 10, padding: '0 40px 80px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ border: '2px solid #FFE600' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', borderBottom: '1px solid #1e1e1e' }}>
            {[
              { label: 'Sneaker Name', value: sneakerName, setter: setSneakerName, placeholder: 'e.g. Jordan 1 Low, Yeezy 350...' },
              { label: 'Size', value: size, setter: setSize, placeholder: 'e.g. US 10, UK 9...' },
              { label: 'Colorway', value: colorway, setter: setColorway, placeholder: 'e.g. University Blue...' },
            ].map((field, i) => (
              <div key={i} style={{ borderRight: '1px solid #1e1e1e' }}>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 10, fontWeight: 700, letterSpacing: 3,
                  textTransform: 'uppercase', color: '#FFE600',
                  padding: '12px 16px 4px', borderBottom: '1px solid #1e1e1e',
                }}>{field.label}</div>
                <input
                  type="text"
                  value={field.value}
                  onChange={e => field.setter(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
                  placeholder={field.placeholder}
                  style={{
                    width: '100%', background: 'transparent', border: 'none',
                    outline: 'none', color: '#f5f0e8', fontSize: 15, fontWeight: 500,
                    padding: '12px 16px', cursor: 'text',
                  }}
                />
              </div>
            ))}

            {/* Region dropdown */}
            <div style={{ borderRight: '1px solid #1e1e1e' }}>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 10, fontWeight: 700, letterSpacing: 3,
                textTransform: 'uppercase', color: '#FFE600',
                padding: '12px 16px 4px', borderBottom: '1px solid #1e1e1e',
              }}>Region</div>
              <select
                value={region}
                onChange={e => setRegion(e.target.value)}
                style={{
                  width: '100%', background: 'transparent', border: 'none',
                  outline: 'none', color: '#f5f0e8', fontSize: 14,
                  padding: '12px 16px', cursor: 'crosshair',
                }}
              >
                {REGION_OPTIONS.map(r => <option key={r} value={r} style={{ background: '#1a1a1a' }}>{r}</option>)}
              </select>
            </div>

            {/* Currency dropdown */}
            <div>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 10, fontWeight: 700, letterSpacing: 3,
                textTransform: 'uppercase', color: '#FFE600',
                padding: '12px 16px 4px', borderBottom: '1px solid #1e1e1e',
              }}>Currency</div>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                style={{
                  width: '100%', background: 'transparent', border: 'none',
                  outline: 'none', color: '#f5f0e8', fontSize: 14,
                  padding: '12px 16px', cursor: 'crosshair',
                }}
              >
                {CURRENCY_OPTIONS.map(c => <option key={c.code} value={c.code} style={{ background: '#1a1a1a' }}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <button
            onClick={handleSearch}
            disabled={searching}
            style={{
              width: '100%', background: searching ? '#333' : '#FFE600',
              color: searching ? '#666' : '#0a0a0a',
              border: 'none',
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 26, letterSpacing: 3,
              padding: '18px', cursor: searching ? 'not-allowed' : 'crosshair',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              transition: 'background 0.15s',
            }}
          >
            {searching ? (
              <>
                <span style={{ display: 'inline-block', width: 20, height: 20, border: '2px solid #666', borderTopColor: '#FFE600', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                SCANNING {activeAgents} SITES...
              </>
            ) : 'LOCK ON TARGET →'}
          </button>
        </div>
      </div>

      {/* Counter strip */}
      {searched && (
        <div style={{
          position: 'relative', zIndex: 10, background: '#FFE600',
          padding: '12px 40px', display: 'flex', alignItems: 'center', gap: 48, overflow: 'hidden',
        }}>
          {[
            { num: agents.length, lbl: 'Sites Targeted' },
            { num: allDrops.length, lbl: 'Results Found' },
            { num: activeAgents, lbl: 'Agents Active' },
            { num: lowestPrice === Infinity ? '—' : `${currencySymbol}${lowestPrice.toFixed(0)}`, lbl: 'Lowest Price' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color: '#0a0a0a', lineHeight: 1 }}>{item.num}</span>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(0,0,0,0.5)' }}>{item.lbl}</span>
            </div>
          ))}
        </div>
      )}

      {/* Agents section */}
      {agents.length > 0 && (
        <div style={{ position: 'relative', zIndex: 10, maxWidth: 1400, margin: '0 auto', padding: '40px 40px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 48, letterSpacing: 4, color: '#f5f0e8' }}>AGENTS</span>
            <div style={{ flex: 1, height: 1, background: '#1e1e1e' }} />
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: '#444' }}>
              {activeAgents} RUNNING · {agents.filter(a => a.status === 'done').length} COMPLETE
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 8 }}>
            {agents.map((agent, i) => <AgentWindow key={i} agent={agent} />)}
          </div>
        </div>
      )}

      {/* Results */}
      {searched && (
        <div style={{ position: 'relative', zIndex: 10, maxWidth: 1400, margin: '0 auto', padding: '40px 40px', display: 'grid', gridTemplateColumns: '260px 1fr', gap: 32 }}>

          {/* Sidebar */}
          <aside>
            {[
              {
                heading: 'Filter by Site',
                items: sitesInResults,
                active: filterSite,
                onSelect: setFilterSite,
              },
              {
                heading: 'Availability',
                items: ['All', 'In Stock', 'Low Stock', 'Pre-Order'],
                active: filterStock,
                onSelect: setFilterStock,
              },
            ].map(sec => (
              <div key={sec.heading} style={{ marginBottom: 28 }}>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 10, fontWeight: 700, letterSpacing: 4,
                  textTransform: 'uppercase', color: '#FFE600',
                  marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #1e1e1e',
                }}>{sec.heading}</div>
                <div>
                  {sec.items.map(item => (
                    <button key={item} onClick={() => sec.onSelect(item)} style={{
                      display: 'inline-flex', alignItems: 'center',
                      padding: '6px 10px', margin: '3px 3px 3px 0',
                      border: `1px solid ${sec.active === item ? '#FFE600' : '#2a2a2a'}`,
                      background: sec.active === item ? 'rgba(255,230,0,0.05)' : 'transparent',
                      color: sec.active === item ? '#FFE600' : '#444',
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: 11, fontWeight: 500, cursor: 'crosshair',
                      transition: 'all 0.15s',
                    }}>{item}</button>
                  ))}
                </div>
              </div>
            ))}
          </aside>

          {/* Main results */}
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #1e1e1e',
            }}>
              <div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, color: '#f5f0e8', lineHeight: 1 }}>
                  <span style={{ color: '#FFE600' }}>{displayDrops.length}</span> RESULTS
                </div>
                {searched && (
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#444', marginTop: 2 }}>
                    {sneakerName} · {colorway || 'Any colorway'} · {size || 'Any size'} · {region}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['quality', 'price-asc', 'price-desc', 'newest'] as const).map(s => (
                  <button key={s} onClick={() => setSortBy(s)} style={{
                    padding: '7px 12px',
                    border: `1px solid ${sortBy === s ? '#FFE600' : '#2a2a2a'}`,
                    background: sortBy === s ? 'rgba(255,230,0,0.06)' : 'transparent',
                    color: sortBy === s ? '#FFE600' : '#444',
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 11, fontWeight: 700, letterSpacing: 2,
                    textTransform: 'uppercase', cursor: 'crosshair', transition: 'all 0.15s',
                  }}>
                    {s === 'quality' ? 'Best Match' : s === 'price-asc' ? 'Price ↑' : s === 'price-desc' ? 'Price ↓' : 'Newest'}
                  </button>
                ))}
              </div>
            </div>

            {allDrops.length === 0 && !searching && (
              <div style={{ padding: '60px 0', textAlign: 'center', color: '#333', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, letterSpacing: 3, textTransform: 'uppercase' }}>
                {searched ? 'No results found — try a different sneaker or region' : 'Enter a sneaker above to start hunting'}
              </div>
            )}

            {allDrops.length === 0 && searching && (
              <div style={{ padding: '60px 0', textAlign: 'center', color: '#444', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, letterSpacing: 3, textTransform: 'uppercase' }}>
                Agents deploying... results will appear as they come in
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 2 }}>
              {displayDrops.map((drop, i) => (
                <ProductCard
                  key={i}
                  drop={drop}
                  selected={isSelected(drop)}
                  onToggleCompare={() => toggleCompare(drop)}
                  currencySymbol={currencySymbol}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Compare bar — ALWAYS visible after search */}
      {searched && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: compareItems.length > 0 ? '#FFE600' : '#1a1a1a',
          zIndex: 100, padding: '14px 40px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderTop: compareItems.length === 0 ? '1px solid #222' : 'none',
          transition: 'background 0.3s',
          animation: 'slideUp 0.3s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              fontFamily: "'Bebas Neue', sans-serif", fontSize: 22,
              color: compareItems.length > 0 ? '#0a0a0a' : '#333', letterSpacing: 2,
            }}>COMPARE</span>
            {compareItems.length === 0 && (
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#444' }}>
                SELECT ITEMS TO COMPARE
              </span>
            )}
            {compareItems.map((item, i) => (
              <div key={i} style={{
                background: '#0a0a0a', color: '#FFE600',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11, fontWeight: 700, letterSpacing: 2,
                textTransform: 'uppercase', padding: '7px 14px',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                {item['Website'] || item._agentSite} {item['Price'] ? `· ${item['Price']}` : ''}
                <span
                  onClick={() => toggleCompare(item)}
                  style={{ cursor: 'crosshair', opacity: 0.6, fontSize: 13 }}
                >×</span>
              </div>
            ))}
            {compareError && (
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#FF2E2E' }}>
                ⚠ SELECT AT LEAST 2 ITEMS
              </span>
            )}
          </div>
          <button
            onClick={() => {
              if (compareItems.length < 2) {
                setCompareError(true)
                setTimeout(() => setCompareError(false), 3000)
                return
              }
              setShowDashboard(true)
            }}
            style={{
              background: compareItems.length >= 2 ? '#0a0a0a' : '#222',
              color: compareItems.length >= 2 ? '#FFE600' : '#555',
              border: 'none',
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 20, letterSpacing: 3,
              padding: '12px 32px', cursor: 'crosshair',
              display: 'flex', alignItems: 'center', gap: 10,
              transition: 'all 0.15s',
            }}
          >
            OPEN DASHBOARD →
          </button>
        </div>
      )}

      {/* Dashboard */}
      {showDashboard && (
        <CompareDashboard
          items={compareItems}
          onClose={() => setShowDashboard(false)}
        />
      )}

      {/* Bottom padding for compare bar */}
      {searched && <div style={{ height: 70 }} />}
    </div>
  )
}
