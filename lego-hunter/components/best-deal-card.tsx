'use client'

import { useEffect } from 'react'
import { ExternalLink, Trophy, Sparkles } from 'lucide-react'
import { triggerVictoryConfetti } from './lego-confetti'
import type { DealAnalysis, ProductData } from '@/types'

interface BestDealCardProps {
  deal: DealAnalysis
  results: ProductData[]
}

export function BestDealCard({ deal, results }: BestDealCardProps) {
  // Find the product data for the best retailer
  const bestProduct = results.find(r => r.retailer === deal.bestRetailer)

  // Trigger confetti on mount
  useEffect(() => {
    if (deal.bestRetailer !== 'None') {
      triggerVictoryConfetti()
    }
  }, [deal.bestRetailer])

  if (deal.bestRetailer === 'None') {
    return (
      <div className="lego-card p-8 text-center border-[var(--lego-red)]">
        <div className="text-6xl mb-4">😢</div>
        <h3 className="text-2xl font-bold text-[var(--lego-black)] mb-2">
          No Stock Found
        </h3>
        <p className="text-[var(--lego-black)]/60 max-w-md mx-auto">
          {deal.reason}
        </p>
        <button className="lego-button mt-6 px-8 py-3">
          Try Another Set
        </button>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 lego-hero-gradient opacity-30 rounded-2xl" />

      <div className="relative lego-card p-8 border-[var(--lego-yellow)] border-4">
        {/* Trophy badge */}
        <div className="absolute -top-4 -right-4 w-16 h-16 bg-[var(--lego-yellow)] rounded-full flex items-center justify-center shadow-lg">
          <Trophy className="w-8 h-8 text-[var(--lego-black)]" />
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Left side - Deal info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-[var(--lego-yellow)]" />
              <span className="text-sm font-bold text-[var(--lego-yellow)] uppercase tracking-wider">
                Best Deal Found!
              </span>
            </div>

            <h3 className="text-3xl font-bold text-[var(--lego-black)] mb-4">
              {deal.bestRetailer}
            </h3>

            <p className="text-[var(--lego-black)]/70 mb-4">{deal.reason}</p>

            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-4xl font-bold text-[var(--lego-green)]">
                {deal.totalCost}
              </span>
              {deal.savings && deal.savings !== 'N/A' && (
                <span className="text-sm font-medium text-[var(--lego-orange)] bg-[var(--lego-orange)]/10 px-2 py-1 rounded">
                  {deal.savings}
                </span>
              )}
            </div>

            {bestProduct && (
              <a
                href={bestProduct.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="lego-button inline-flex items-center gap-2 px-8 py-4 text-lg"
              >
                BUILD YOUR SET
                <ExternalLink className="w-5 h-5" />
              </a>
            )}
          </div>

          {/* Right side - Alternative options */}
          {deal.alternativeOptions && deal.alternativeOptions.length > 0 && (
            <div className="md:w-64 bg-[var(--lego-gray)] rounded-lg p-4">
              <h4 className="text-sm font-bold text-[var(--lego-black)] uppercase tracking-wider mb-3">
                Other Options
              </h4>
              <div className="space-y-3">
                {deal.alternativeOptions.slice(0, 3).map((alt, index) => (
                  <div
                    key={index}
                    className="bg-white rounded p-3 border border-[var(--lego-gray-dark)]"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-sm">{alt.retailer}</span>
                      <span className="text-sm font-bold">{alt.cost}</span>
                    </div>
                    {alt.pros && alt.pros.length > 0 && (
                      <ul className="text-xs text-[var(--lego-black)]/60">
                        {alt.pros.slice(0, 2).map((pro, i) => (
                          <li key={i}>• {pro}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
