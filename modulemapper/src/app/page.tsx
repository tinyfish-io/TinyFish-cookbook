'use client'
import { useState, useRef, useEffect } from 'react'
import type { CourseVerdict, ReviewCard } from '@/lib/types'

interface Agent {
  id: string
  source: string
  status: 'waiting' | 'running' | 'done' | 'error'
  statusText?: string
}

type AppState = 'idle' | 'discovering' | 'scraping' | 'synthesising' | 'done' | 'error'

export default function Home() {
  const [code, setCode] = useState('')
  const [university, setUniversity] = useState('')
  const [appState, setAppState] = useState<AppState>('idle')
  const [agents, setAgents] = useState<Agent[]>([])
  const [verdict, setVerdict] = useState<CourseVerdict | null>(null)
  const [error, setError] = useState('')
  const [showAllReviews, setShowAllReviews] = useState(false)
  const [discoveryData, setDiscoveryData] = useState<Record<string, unknown> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  async function handleAnalyse() {
    if (!code.trim() || !university.trim()) return
    setError('')
    setVerdict(null)
    setAgents([])
    setShowAllReviews(false)
    setAppState('discovering')

    try {
      const discRes = await fetch(`/api/discover?code=${encodeURIComponent(code.trim().toUpperCase())}&university=${encodeURIComponent(university.trim())}`)
      const disc = await discRes.json()
      if (disc.error) throw new Error(disc.error)
      setDiscoveryData(disc)
      setAppState('scraping')

      abortRef.current = new AbortController()
      const scrapeRes = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(disc),
        signal: abortRef.current.signal
      })

      if (!scrapeRes.body) throw new Error('No stream')
      const reader = scrapeRes.body.getReader()
      const decoder = new TextDecoder()
      const allResults: { source: string; raw: string }[] = []
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data:')) continue
          const data = trimmed.slice(5).trim()
          if (data === '[DONE]') continue
          try {
            const event = JSON.parse(data)
            if (event.type === 'agents') {
              setAgents(event.agents.map((a: { id: string; source: string }) => ({ ...a, status: 'waiting' })))
            } else if (event.type === 'agent_start') {
              setAgents(prev => prev.map(a => a.id === event.id ? { ...a, status: 'running', statusText: 'Scraping...' } : a))
            } else if (event.type === 'agent_done') {
              setAgents(prev => prev.map(a => a.id === event.id ? { ...a, status: event.error ? 'error' : 'done', statusText: event.error ? 'Error' : 'Done' } : a))
              if (event.raw) allResults.push({ source: event.source, raw: event.raw })
            } else if (event.type === 'all_done') {
              break
            }
          } catch { /* skip malformed */ }
        }
      }

      setAppState('synthesising')
      const synthRes = await fetch('/api/synthesise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase(), university: university.trim(), results: allResults })
      })
      const synth = await synthRes.json()
      if (synth.error) throw new Error(synth.error)
      setVerdict(synth)
      setAppState('done')
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setAppState('error')
    }
  }

  const displayedReviews = verdict
    ? showAllReviews ? verdict.reviews : verdict.reviews.slice(0, 4)
    : []

  return (
    <main style={{ minHeight: '100vh', background: 'var(--gray-bg)' }}>
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '2rem 1.25rem' }}>

        <header style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 22, fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
              Module<span style={{ color: 'var(--blue)' }}>Mapper</span>
            </span>
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', fontFamily: "'DM Mono', monospace" }}>
            real student reviews · any university · any course
          </p>
        </header>

        <div style={{ background: '#fff', border: '0.5px solid var(--gray-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr auto', gap: 12, alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, fontFamily: "'DM Mono', monospace" }}>Course code</label>
              <input
                type="text"
                placeholder="BT1101, CS50, MATH101..."
                value={code}
                onChange={e => setCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAnalyse()}
                style={{ width: '100%', padding: '10px 14px', border: '0.5px solid var(--gray-border)', borderRadius: 'var(--radius-md)', fontSize: 14, background: 'var(--gray-bg)', color: 'var(--text-primary)', outline: 'none', fontFamily: "'DM Mono', monospace" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, fontFamily: "'DM Mono', monospace" }}>University</label>
              <input
                type="text"
                placeholder="NUS, Harvard, MIT, Oxford..."
                value={university}
                onChange={e => setUniversity(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAnalyse()}
                style={{ width: '100%', padding: '10px 14px', border: '0.5px solid var(--gray-border)', borderRadius: 'var(--radius-md)', fontSize: 14, background: 'var(--gray-bg)', color: 'var(--text-primary)', outline: 'none' }}
              />
            </div>
            <button
              onClick={handleAnalyse}
              disabled={appState !== 'idle' && appState !== 'done' && appState !== 'error'}
              style={{ padding: '10px 24px', background: 'var(--blue)', color: '#E6F1FB', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 500, cursor: 'pointer', height: 42, whiteSpace: 'nowrap' }}
            >
              {appState === 'discovering' ? 'Discovering...' :
               appState === 'scraping' ? 'Scraping...' :
               appState === 'synthesising' ? 'Analysing...' : 'Analyse'}
            </button>
          </div>
        </div>

        {(appState === 'scraping' || appState === 'synthesising' || appState === 'done') && agents.length > 0 && (
          <div style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {agents.map(agent => (
              <div key={agent.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#fff', border: '0.5px solid var(--gray-border)',
                borderRadius: 'var(--radius-md)', padding: '7px 12px',
                fontSize: 12, color: 'var(--text-secondary)',
                opacity: agent.status === 'done' ? 0.5 : 1,
                transition: 'opacity 0.5s'
              }}>
                <div style={{
                  width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                  background: agent.status === 'done' ? '#639922' : agent.status === 'error' ? '#E24B4A' : agent.status === 'running' ? 'var(--blue)' : '#B4B2A9',
                  animation: agent.status === 'running' ? 'pulse 1s infinite' : 'none'
                }} />
                {agent.source} {agent.status === 'done' ? '· done' : agent.status === 'error' ? '· error' : agent.status === 'running' ? '· scraping...' : '· waiting'}
              </div>
            ))}
            {appState === 'synthesising' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#E6F1FB', border: '0.5px solid #B5D4F4', borderRadius: 'var(--radius-md)', padding: '7px 12px', fontSize: 12, color: 'var(--blue-dark)' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--blue)', animation: 'pulse 1s infinite' }} />
                Groq is synthesising verdict...
              </div>
            )}
          </div>
        )}

        {appState === 'discovering' && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', fontSize: 14 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--blue)', margin: '0 auto 12px', animation: 'pulse 1s infinite' }} />
            Discovering sources for {university}...
          </div>
        )}

        {appState === 'error' && (
          <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', color: '#791F1F', fontSize: 14, marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        {verdict && appState === 'done' && (
          <div className="animate-in">
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>
                {code.toUpperCase()} · {university}
              </p>
              <h1 style={{ fontSize: 22, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 10, letterSpacing: '-0.3px' }}>
                {(discoveryData as { title?: string })?.title || `${code.toUpperCase()} Course Review`}
              </h1>
              {verdict.sourceCounts && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {Object.entries(verdict.sourceCounts).map(([src, count]) => (
                    <span key={src} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'var(--blue-light)', color: 'var(--blue-dark)', fontFamily: "'DM Mono', monospace" }}>
                      {src}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div style={{ background: '#fff', border: '0.5px solid var(--gray-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
                  <div style={{ background: 'var(--blue)', color: '#E6F1FB', fontSize: 22, fontWeight: 500, padding: '6px 16px', borderRadius: 'var(--radius-md)', fontFamily: "'DM Mono', monospace" }}>
                    {typeof verdict.score === 'number' ? verdict.score.toFixed(1) : verdict.score}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 15, color: 'var(--text-primary)' }}>{verdict.verdict}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Overall verdict out of 10</div>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.75, marginBottom: '1rem' }}>{verdict.summary}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {verdict.tags?.map((tag, i) => {
                    const colors: Record<string, { bg: string; text: string }> = {
                      blue: { bg: 'var(--blue-light)', text: 'var(--blue-dark)' },
                      green: { bg: 'var(--green-light)', text: 'var(--green-dark)' },
                      amber: { bg: 'var(--amber-light)', text: 'var(--amber-dark)' },
                      red: { bg: 'var(--red-light)', text: 'var(--red-dark)' }
                    }
                    const c = colors[tag.color] || colors.blue
                    return (
                      <span key={i} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: c.bg, color: c.text }}>
                        {tag.label}
                      </span>
                    )
                  })}
                </div>
              </div>

              <div style={{ background: '#fff', border: '0.5px solid var(--gray-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                <div style={{ display: 'flex', gap: 20 }}>
                  <DonutChart value={verdict.difficulty} label="Difficulty" color="var(--blue)" />
                  <DonutChart value={verdict.workload} label="Workload" color="#378ADD" />
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center', fontFamily: "'DM Mono', monospace" }}>{verdict.hoursPerWeek}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: '1.25rem' }}>
              {[
                { label: 'Final exam', val: verdict.hasExam ? 'Yes' : 'No', sub: verdict.examDifficulty },
                { label: 'Average grade', val: verdict.averageGrade, sub: verdict.gradingPattern },
                { label: 'Assessment', val: verdict.assessment, sub: '' },
                { label: 'Attendance', val: verdict.attendance, sub: '' }
              ].map((s, i) => (
                <div key={i} style={{ background: 'var(--gray-bg)', borderRadius: 'var(--radius-md)', padding: '12px 14px', border: '0.5px solid var(--gray-border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 5, fontFamily: "'DM Mono', monospace" }}>{s.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{s.val}</div>
                  {s.sub && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{s.sub}</div>}
                </div>
              ))}
            </div>

            {verdict.bestFor && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '1.25rem' }}>
                <div style={{ background: 'var(--green-light)', border: '0.5px solid #C0DD97', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, color: 'var(--green-dark)', marginBottom: 5, fontFamily: "'DM Mono', monospace" }}>Best for</div>
                  <div style={{ fontSize: 13, color: 'var(--green-dark)' }}>{verdict.bestFor}</div>
                </div>
                <div style={{ background: 'var(--amber-light)', border: '0.5px solid #FAC775', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, color: 'var(--amber-dark)', marginBottom: 5, fontFamily: "'DM Mono', monospace" }}>Not great if</div>
                  <div style={{ fontSize: 13, color: 'var(--amber-dark)' }}>{verdict.notGreatIf}</div>
                </div>
              </div>
            )}

            {verdict.whatYouLearn && verdict.whatYouLearn.length > 0 && (
              <div style={{ background: '#fff', border: '0.5px solid var(--gray-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: 14, fontWeight: 500, marginBottom: 12, fontFamily: "'DM Mono', monospace", color: 'var(--text-secondary)' }}>What you will learn</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {verdict.whatYouLearn.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.65 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--blue)', marginTop: 6, flexShrink: 0 }} />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <h2 style={{ fontSize: 14, fontWeight: 500, marginBottom: 12, fontFamily: "'DM Mono', monospace", color: 'var(--text-secondary)' }}>Student reviews</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              {displayedReviews.map((review: ReviewCard, i: number) => {
                const sentColors: Record<string, { bg: string; text: string }> = {
                  positive: { bg: 'var(--green-light)', text: 'var(--green-dark)' },
                  negative: { bg: 'var(--red-light)', text: 'var(--red-dark)' },
                  mixed: { bg: 'var(--amber-light)', text: 'var(--amber-dark)' }
                }
                const sc = sentColors[review.sentiment] || sentColors.mixed
                return (
                  <div key={i} style={{ background: '#fff', border: '0.5px solid var(--gray-border)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--blue-light)', color: 'var(--blue-dark)', fontFamily: "'DM Mono', monospace" }}>{review.source}</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: sc.bg, color: sc.text }}>{review.sentiment}</span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.65, fontFamily: "'DM Serif Display', Georgia, serif", fontStyle: 'italic' }}>"{review.text}"</p>
                    {review.date && <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8, fontFamily: "'DM Mono', monospace" }}>{review.date}</p>}
                  </div>
                )
              })}
            </div>
            {verdict.reviews.length > 4 && (
              <button
                onClick={() => setShowAllReviews(v => !v)}
                style={{ width: '100%', padding: '10px', background: 'var(--gray-bg)', border: '0.5px solid var(--gray-border)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                {showAllReviews ? 'Show fewer reviews' : `Load more reviews (${verdict.reviews.length - 4} remaining)`}
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

function DonutChart({ value, label, color }: { value: number; label: string; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = 90
    const cx = size / 2, cy = size / 2
    const r = 32, lineW = 10
    const pct = Math.min(Math.max(value, 0), 10) / 10

    ctx.clearRect(0, 0, size, size)
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(0,0,0,0.07)'
    ctx.lineWidth = lineW
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2)
    ctx.strokeStyle = color
    ctx.lineWidth = lineW
    ctx.lineCap = 'round'
    ctx.stroke()

    ctx.fillStyle = '#0F1923'
    ctx.font = '500 16px DM Mono, monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(Math.round(value).toString(), cx, cy)
  }, [value, color])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <canvas ref={canvasRef} width={90} height={90} />
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: "'DM Mono', monospace" }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', fontFamily: "'DM Mono', monospace" }}>{Math.round(value)} / 10</div>
    </div>
  )
}
