'use client'

import { useState, useCallback } from 'react'
import { Search, Loader2, Zap, Store, Trophy, ExternalLink, Package, PackageX, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { triggerLegoConfetti, triggerVictoryConfetti } from '@/components/lego-confetti'
import { DEFAULT_RETAILERS } from '@/lib/retailers'
import type {
  Retailer,
  RetailerStatus,
  ProductData,
  DealAnalysis,
  SSEEvent
} from '@/types'

export default function LegoFinderPage() {
  const [legoSetName, setLegoSetName] = useState('')
  const [maxBudget, setMaxBudget] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isGeneratingUrls, setIsGeneratingUrls] = useState(false)
  const [retailers, setRetailers] = useState<Record<string, RetailerStatus>>({})
  const [results, setResults] = useState<ProductData[]>([])
  const [bestDeal, setBestDeal] = useState<DealAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showAgents, setShowAgents] = useState(true)

  const initializeRetailers = useCallback((retailerList: Retailer[]) => {
    const initial: Record<string, RetailerStatus> = {}
    retailerList.forEach(r => {
      initial[r.name] = { name: r.name, status: 'idle', steps: [] }
    })
    setRetailers(initial)
  }, [])

  const handleSSEEvent = useCallback((event: SSEEvent) => {
    switch (event.type) {
      case 'retailer_start':
        setRetailers(prev => ({
          ...prev,
          [event.retailer!]: {
            ...prev[event.retailer!],
            status: 'searching',
            streamingUrl: event.streamingUrl || prev[event.retailer!]?.streamingUrl
          }
        }))
        break
      case 'retailer_step':
        setRetailers(prev => ({
          ...prev,
          [event.retailer!]: {
            ...prev[event.retailer!],
            steps: [...(prev[event.retailer!]?.steps || []).slice(-10), event.step!]
          }
        }))
        break
      case 'retailer_stock_found':
        triggerLegoConfetti()
        setRetailers(prev => ({
          ...prev,
          [event.retailer!]: { ...prev[event.retailer!], stockFound: true }
        }))
        break
      case 'retailer_complete':
        setRetailers(prev => ({
          ...prev,
          [event.retailer!]: { ...prev[event.retailer!], status: 'complete', data: event.data }
        }))
        if (event.data) setResults(prev => [...prev, event.data!])
        break
      case 'retailer_error':
        setRetailers(prev => ({
          ...prev,
          [event.retailer!]: { ...prev[event.retailer!], status: 'error', error: event.error }
        }))
        break
      case 'analysis_complete':
        setBestDeal(event.bestDeal || null)
        setIsSearching(false)
        if (event.bestDeal && event.bestDeal.bestRetailer !== 'None') {
          triggerVictoryConfetti()
        }
        break
      case 'error':
        setError(event.error || 'An error occurred')
        setIsSearching(false)
        break
    }
  }, [])

  const handleSearch = async () => {
    if (!legoSetName.trim()) {
      setError('Please enter a Lego set name or number')
      return
    }
    setError(null)
    setResults([])
    setBestDeal(null)
    setIsSearching(true)
    setIsGeneratingUrls(true)

    try {
      const urlResponse = await fetch('/api/generate-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ legoSetName: legoSetName.trim() })
      })
      if (!urlResponse.ok) throw new Error('Failed to generate retailer URLs')
      const { retailers: generatedRetailers } = await urlResponse.json()
      setIsGeneratingUrls(false)
      initializeRetailers(generatedRetailers)

      const searchResponse = await fetch('/api/search-lego', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legoSetName: legoSetName.trim(),
          maxBudget: parseFloat(maxBudget) || 1000,
          retailers: generatedRetailers
        })
      })
      if (!searchResponse.ok) throw new Error('Failed to start search')

      const reader = searchResponse.body?.getReader()
      if (!reader) throw new Error('No response stream')
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              handleSSEEvent(JSON.parse(line.slice(6)))
            } catch (e) {
              console.warn('Failed to parse SSE event:', e)
            }
          }
        }
      }
    } catch (err) {
      console.error('Search error:', err)
      setError(err instanceof Error ? err.message : 'Search failed')
      setIsSearching(false)
      setIsGeneratingUrls(false)
    }
  }

  const getRetailerLogo = (name: string) => DEFAULT_RETAILERS.find(r => r.name === name)?.logo || '🏪'
  const retailerList = Object.values(retailers)
  const completedCount = retailerList.filter(r => r.status === 'complete' || r.status === 'error').length
  const inStockCount = results.filter(r => r.inStock).length
  const totalCount = retailerList.length
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <div className="min-h-screen bg-[var(--lego-cream)]">
      {/* Colored accent stripe at top */}
      <div className="accent-stripe h-1" />

      {/* Hero Section */}
      <header className="relative bg-white border-b border-[var(--lego-gray-200)]">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-20">
          <div className="max-w-3xl">
            {/* Brick stud decoration */}
            <div className="flex gap-2 mb-6">
              <div className="brick-stud brick-stud-red" />
              <div className="brick-stud brick-stud-yellow" />
              <div className="brick-stud brick-stud-blue" />
            </div>

            <h1 className="text-display text-4xl md:text-5xl lg:text-6xl font-black text-[var(--lego-black)] tracking-tight mb-4">
              Lego Restock
              <span className="block text-[var(--lego-blue)]">Hunter</span>
            </h1>

            <p className="text-lg md:text-xl text-[var(--lego-gray-500)] max-w-xl leading-relaxed">
              Search 15 retailers simultaneously to find sold-out Lego sets.
              Powered by AI to find you the best deal.
            </p>
          </div>
        </div>
      </header>

      {/* Search Section */}
      <section className="py-10 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="brick-card p-6 md:p-8">
            <div className="grid gap-6">
              {/* Search inputs */}
              <div className="grid md:grid-cols-[1fr,180px] gap-4">
                <div>
                  <label className="block text-display text-sm font-bold text-[var(--lego-gray-500)] uppercase tracking-wider mb-2">
                    Lego Set Name or Number
                  </label>
                  <input
                    type="text"
                    value={legoSetName}
                    onChange={e => setLegoSetName(e.target.value)}
                    placeholder="e.g., 75192 Millennium Falcon"
                    className="brick-input"
                    disabled={isSearching}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <div>
                  <label className="block text-display text-sm font-bold text-[var(--lego-gray-500)] uppercase tracking-wider mb-2">
                    Max Budget
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--lego-gray-400)] font-semibold">$</span>
                    <input
                      type="number"
                      value={maxBudget}
                      onChange={e => setMaxBudget(e.target.value)}
                      placeholder="1000"
                      className="brick-input pl-8"
                      disabled={isSearching}
                    />
                  </div>
                </div>
              </div>

              {/* Search button */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <button
                  onClick={handleSearch}
                  disabled={isSearching || !legoSetName.trim()}
                  className="brick-button w-full sm:w-auto"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Hunting...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      Hunt for Stock
                    </>
                  )}
                </button>

                {!isSearching && (
                  <p className="text-sm text-[var(--lego-gray-400)] flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Searches 15 retailers in parallel
                  </p>
                )}
              </div>

              {/* Progress bar */}
              {isSearching && (
                <div className="animate-fade-up">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-[var(--lego-gray-500)] font-medium">
                      {isGeneratingUrls ? 'Generating search URLs with AI...' : `Checking ${completedCount} of ${totalCount} retailers`}
                    </span>
                    {!isGeneratingUrls && (
                      <span className="text-display font-bold text-[var(--lego-black)]">{Math.round(progress)}%</span>
                    )}
                  </div>
                  <div className="brick-progress">
                    <div
                      className={`brick-progress-bar ${isGeneratingUrls ? 'loading' : ''}`}
                      style={{ width: isGeneratingUrls ? '15%' : `${progress}%` }}
                    />
                  </div>
                  {inStockCount > 0 && (
                    <p className="mt-2 text-sm font-semibold text-[var(--lego-green)] flex items-center gap-1">
                      <Package className="w-4 h-4" />
                      {inStockCount} in stock found!
                    </p>
                  )}
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Best Deal Section */}
      {bestDeal && bestDeal.bestRetailer !== 'None' && (
        <section className="py-8 px-6 animate-scale-in">
          <div className="max-w-4xl mx-auto">
            <div className="brick-card p-6 md:p-8 border-2 border-[var(--lego-yellow)] animate-glow-yellow">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-[var(--lego-yellow)] flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-7 h-7 text-[var(--lego-black)]" />
                </div>
                <div>
                  <p className="text-display text-sm font-bold text-[var(--lego-yellow-dark)] uppercase tracking-wider mb-1">
                    Best Deal Found
                  </p>
                  <h2 className="text-display text-2xl md:text-3xl font-black text-[var(--lego-black)]">
                    {bestDeal.bestRetailer}
                  </h2>
                </div>
              </div>

              <p className="text-[var(--lego-gray-500)] mb-6 leading-relaxed">
                {bestDeal.reason}
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <div className="bg-[var(--lego-gray-100)] rounded-lg px-4 py-2">
                  <p className="text-xs text-[var(--lego-gray-500)] uppercase font-bold tracking-wider">Total Cost</p>
                  <p className="text-display text-2xl font-black text-[var(--lego-green)]">{bestDeal.totalCost}</p>
                </div>
                {bestDeal.savings && bestDeal.savings !== 'N/A' && (
                  <div className="brick-badge brick-badge-green">
                    {bestDeal.savings}
                  </div>
                )}
              </div>

              {results.find(r => r.retailer === bestDeal.bestRetailer)?.productUrl && (
                <a
                  href={results.find(r => r.retailer === bestDeal.bestRetailer)?.productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="brick-button mt-6 inline-flex text-lg px-8 py-4 animate-pulse hover:animate-none"
                >
                  <ExternalLink className="w-6 h-6" />
                  🛒 Buy Now - Get It Before It&apos;s Gone!
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* No Stock Found */}
      {bestDeal && bestDeal.bestRetailer === 'None' && (
        <section className="py-8 px-6 animate-scale-in">
          <div className="max-w-4xl mx-auto">
            <div className="brick-card brick-card-accent-red p-6 md:p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <PackageX className="w-8 h-8 text-[var(--lego-red)]" />
              </div>
              <h2 className="text-display text-2xl font-black text-[var(--lego-black)] mb-2">
                No Stock Found
              </h2>
              <p className="text-[var(--lego-gray-500)] max-w-md mx-auto">
                {bestDeal.reason}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Retailer Grid */}
      {retailerList.length > 0 && (
        <section className="py-10 px-6 brick-pattern-subtle">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Store className="w-6 h-6 text-[var(--lego-blue)]" />
                <h2 className="text-display text-xl font-bold text-[var(--lego-black)]">
                  Retailer Status
                </h2>
                <span className="text-sm text-[var(--lego-gray-400)]">
                  ({completedCount}/{totalCount} complete)
                </span>
              </div>
              <button
                onClick={() => setShowAgents(!showAgents)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--lego-gray-500)] hover:text-[var(--lego-black)] bg-white hover:bg-[var(--lego-gray-100)] border border-[var(--lego-gray-200)] rounded-full transition-all duration-200"
              >
                {showAgents ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    Hide Agents
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    Show Agents
                  </>
                )}
              </button>
            </div>

            {showAgents && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {retailerList.map((r, i) => (
                  <RetailerStatusCard
                    key={r.name}
                    retailer={r}
                    logo={getRetailerLogo(r.name)}
                    delay={i * 0.05}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Results Table */}
      {results.length > 0 && !isSearching && (
        <section className="py-10 px-6 bg-white border-t border-[var(--lego-gray-200)]">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-display text-xl font-bold text-[var(--lego-black)] mb-6">
              All Results
            </h2>
            <ResultsTable results={results} />
          </div>
        </section>
      )}

      {/* Empty State */}
      {!isSearching && retailerList.length === 0 && (
        <section className="py-20 px-6 text-center">
          <div className="max-w-md mx-auto flex flex-col items-center">
            <div className="flex justify-center items-center gap-3 mb-6">
              {['red', 'yellow', 'blue'].map((color, i) => (
                <div key={color} className={`w-12 h-12 rounded-lg brick-stud-${color} animate-brick-stack`} style={{ animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
            <h2 className="text-display text-2xl font-bold text-[var(--lego-black)] mb-3">
              Ready to Hunt
            </h2>
            <p className="text-[var(--lego-gray-500)]">
              Enter a Lego set name or number above to search across 15 retailers simultaneously.
            </p>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-8 px-6 bg-[var(--lego-black)] text-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-sm bg-[var(--lego-red)]" />
              <div className="w-3 h-3 rounded-sm bg-[var(--lego-yellow)]" />
              <div className="w-3 h-3 rounded-sm bg-[var(--lego-blue)]" />
            </div>
            <span className="text-display font-bold">Lego Restock Hunter</span>
          </div>
          <p className="text-sm text-white/50">
            Powered by Mino AI + Gemini. Not affiliated with LEGO Group.
          </p>
        </div>
      </footer>
    </div>
  )
}

/* Retailer Status Card Component - Lego Brick Style */
function RetailerStatusCard({ retailer, logo, delay }: { retailer: RetailerStatus; logo: string; delay: number }) {
  // Determine brick color based on status - prioritize complete status over stockFound
  const getBrickColor = () => {
    // First check if search is complete
    if (retailer.status === 'complete') {
      return retailer.data?.inStock ? 'lego-brick-green' : 'lego-brick-gray'
    }
    // Error state
    if (retailer.status === 'error') {
      return 'lego-brick-red'
    }
    // Searching states
    if (retailer.status === 'searching') {
      // Celebration moment when stock is found but not yet complete
      return retailer.stockFound ? 'lego-brick-yellow' : 'lego-brick-orange'
    }
    // Idle state
    return 'lego-brick-blue'
  }

  // Check if this is a "success" card (in stock and complete)
  const isInStock = retailer.status === 'complete' && retailer.data?.inStock

  // Determine if card should have celebration glow
  const shouldGlow = retailer.stockFound || isInStock

  return (
    <div
      className={`${getBrickColor()} lego-brick-card ${shouldGlow ? 'lego-brick-success' : ''}`}
      style={{
        animationDelay: `${delay}s`,
      }}
    >
      {/* Lego Studs */}
      <div className="lego-studs">
        <div className="lego-stud-3d" />
        <div className="lego-stud-3d" />
        <div className="lego-stud-3d" />
        <div className="lego-stud-3d" />
      </div>

      {/* Brick Body */}
      <div className="lego-brick-body">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg flex-shrink-0">{logo}</span>
            <span className="font-bold text-white text-sm truncate">{retailer.name}</span>
          </div>
          <StatusIndicator status={retailer.status} stockFound={retailer.stockFound} inStock={isInStock} />
        </div>

        {/* Browser Preview */}
        <div className="lego-browser-preview">
          {retailer.streamingUrl ? (
            <iframe
              src={retailer.streamingUrl}
              className="w-full h-full border-0"
              title={`Browser preview for ${retailer.name}`}
              sandbox="allow-same-origin allow-scripts"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[var(--lego-gray-100)]">
              {retailer.status === 'searching' ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 text-[var(--lego-gray-400)] animate-spin" />
                  <span className="text-xs text-[var(--lego-gray-400)]">Loading browser...</span>
                </div>
              ) : retailer.status === 'idle' ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="text-2xl">🧱</div>
                  <span className="text-xs text-[var(--lego-gray-400)]">Ready</span>
                </div>
              ) : (
                <div className="text-2xl">
                  {retailer.status === 'complete' ? (retailer.data?.inStock ? '✅' : '❌') : '⚠️'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status Info */}
        <div className="mt-3">
          {retailer.status === 'searching' && (
            <p className="text-xs text-white/80 truncate">
              {retailer.stockFound ? '🎉 Stock found! Finishing up...' : (retailer.steps[retailer.steps.length - 1] || 'Searching...')}
            </p>
          )}

          {retailer.status === 'complete' && retailer.data && (
            <div className="space-y-2">
              {retailer.data.inStock ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-1">
                      <Package className="w-3 h-3" /> In Stock
                    </span>
                    {retailer.data.price !== '0' && (
                      <span className="font-black text-white text-lg">
                        ${retailer.data.price}
                      </span>
                    )}
                  </div>
                  {/* Buy Now Button - Prominent for influencer videos */}
                  {retailer.data.productUrl && (
                    <a
                      href={retailer.data.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 bg-white text-[var(--lego-green)] font-bold text-xs py-2 px-3 rounded-lg hover:bg-white/90 transition-all shadow-md hover:shadow-lg"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Buy Now
                    </a>
                  )}
                </>
              ) : (
                <span className="text-xs font-bold text-white/70 uppercase tracking-wide">Out of Stock</span>
              )}
            </div>
          )}

          {retailer.status === 'error' && (
            <p className="text-xs text-white/80 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Failed to search
            </p>
          )}

          {retailer.status === 'idle' && (
            <p className="text-xs text-white/80">Waiting to start...</p>
          )}
        </div>
      </div>
    </div>
  )
}

/* Status Indicator */
function StatusIndicator({ status, stockFound, inStock }: { status: string; stockFound?: boolean; inStock?: boolean }) {
  // Complete and in stock - checkmark badge
  if (status === 'complete' && inStock) {
    return (
      <div className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5">
        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
        <span className="text-[10px] font-bold text-white uppercase">Found</span>
      </div>
    )
  }
  // Stock found but still processing
  if (stockFound && status === 'searching') {
    return <span className="text-lg animate-bounce">🎉</span>
  }
  switch (status) {
    case 'searching':
      return <Loader2 className="w-4 h-4 text-white/80 animate-spin" />
    case 'complete':
      return <div className="w-3 h-3 rounded-full bg-white/40" />
    case 'error':
      return <div className="w-3 h-3 rounded-full bg-white/60" />
    default:
      return <div className="w-3 h-3 rounded-full bg-white/30" />
  }
}

/* Results Table */
function ResultsTable({ results }: { results: ProductData[] }) {
  const sorted = [...results].sort((a, b) => {
    if (a.inStock && !b.inStock) return -1
    if (!a.inStock && b.inStock) return 1
    return (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0)
  })

  return (
    <div className="brick-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="brick-table">
          <thead>
            <tr>
              <th>Retailer</th>
              <th>Status</th>
              <th>Price</th>
              <th>Shipping</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={`${r.retailer}-${i}`} className={!r.inStock ? 'out-of-stock' : ''}>
                <td className="font-medium">{r.retailer}</td>
                <td>
                  {r.inStock ? (
                    <span className="brick-badge brick-badge-green">In Stock</span>
                  ) : (
                    <span className="brick-badge brick-badge-red">Out of Stock</span>
                  )}
                </td>
                <td className="font-bold">
                  {r.inStock && r.price !== '0' ? `$${r.price}` : '-'}
                </td>
                <td className="text-[var(--lego-gray-500)]">
                  {r.inStock ? r.shipping : '-'}
                </td>
                <td>
                  {r.inStock ? (
                    <a
                      href={r.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="brick-button-blue text-xs px-3 py-1.5 inline-flex items-center gap-1"
                    >
                      View <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <button className="text-xs text-[var(--lego-gray-400)] hover:text-[var(--lego-gray-500)]">
                      Notify Me
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
