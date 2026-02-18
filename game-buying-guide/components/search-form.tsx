'use client'

import React from "react"

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
        <div className="flex items-center justify-center gap-3 mb-4">
          <Gamepad2 className="w-10 h-10 text-primary" />
          <h1 className="text-4xl font-bold text-foreground">GamePulse</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Should you buy now or wait? Let AI analyze prices across platforms.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Enter game title (e.g., Elden Ring, Cyberpunk 2077)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-12 h-14 text-lg bg-card border-border focus:border-primary"
            disabled={isLoading}
          />
        </div>
        <Button
          type="submit"
          size="lg"
          className="h-14 px-8 text-lg font-semibold"
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

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {['Elden Ring', 'Cyberpunk 2077', 'Baldurs Gate 3', 'Red Dead Redemption 2'].map((game) => (
          <button
            key={game}
            type="button"
            onClick={() => setQuery(game)}
            className="px-3 py-1.5 text-sm rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            {game}
          </button>
        ))}
      </div>
    </div>
  )
}
