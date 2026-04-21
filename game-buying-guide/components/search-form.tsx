'use client'

import { useState } from 'react'
import { Search, Gamepad2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface SearchFormProps {
  onSearch: (query: string) => void
  isLoading: boolean
}

export function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [query, setQuery] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim() && !isLoading) {
      onSearch(query.trim())
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center">
            <Gamepad2 className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">GamePulse</h1>
        </div>
        <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
          Should you buy now or wait? Let AI analyze prices across platforms.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Enter game title (e.g., Elden Ring, Cyberpunk 2077)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-12 h-14 text-base md:text-lg bg-card/80 backdrop-blur border-border focus-visible:ring-primary/30"
            disabled={isLoading}
          />
        </div>
        <Button
          type="submit"
          size="lg"
          className="h-14 px-8 text-base md:text-lg font-semibold shadow-sm"
          disabled={!query.trim() || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Analyzing
            </>
          ) : (
            'Search'
          )}
        </Button>
      </form>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {['Elden Ring', 'Cyberpunk 2077', 'Baldurs Gate 3', 'Red Dead Redemption 2'].map((game) => (
          <button
            key={game}
            type="button"
            onClick={() => setQuery(game)}
            className="px-3 py-1.5 text-sm rounded-full bg-secondary/70 text-secondary-foreground hover:bg-secondary transition-colors"
          >
            {game}
          </button>
        ))}
      </div>
    </div>
  )
}
