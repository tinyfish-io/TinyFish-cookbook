'use client'

import { useEffect, useRef } from 'react'
import { BrowserPreview } from './browser-preview'
import { triggerConfettiAtElement } from './lego-confetti'
import type { RetailerStatus } from '@/types'
import { Loader2, Check, X, ExternalLink } from 'lucide-react'

interface RetailerCardProps {
  retailerStatus: RetailerStatus
  logo?: string
}

export function RetailerCard({ retailerStatus, logo }: RetailerCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const hasTriggeredConfetti = useRef(false)

  const { name, status, streamingUrl, data, stockFound, error, steps } =
    retailerStatus

  // Trigger confetti when stock is found
  useEffect(() => {
    if (stockFound && !hasTriggeredConfetti.current && cardRef.current) {
      hasTriggeredConfetti.current = true
      triggerConfettiAtElement(cardRef.current)
    }
  }, [stockFound])

  // Determine card border color based on status
  const getBorderClass = () => {
    if (stockFound) return 'stock-found'
    switch (status) {
      case 'searching':
        return 'status-searching'
      case 'complete':
        return 'status-complete'
      case 'error':
        return 'status-error'
      default:
        return 'status-idle'
    }
  }

  // Get latest step message
  const latestStep = steps?.[steps.length - 1] || ''

  return (
    <div
      ref={cardRef}
      className={`lego-card p-4 ${getBorderClass()} transition-all duration-300`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{logo || '🏪'}</span>
          <h3 className="font-bold text-[var(--lego-black)] truncate">{name}</h3>
        </div>
        <StatusIcon status={status} stockFound={stockFound} />
      </div>

      {/* Browser Preview */}
      <div className="mb-3">
        <BrowserPreview
          streamingUrl={streamingUrl}
          retailerName={name}
          status={status}
        />
      </div>

      {/* Status Message */}
      <div className="min-h-[48px]">
        {status === 'searching' && (
          <div className="text-sm text-[var(--lego-orange)]">
            <div className="font-medium flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching...
            </div>
            {latestStep && (
              <p className="text-xs text-[var(--lego-black)]/50 mt-1 truncate">
                {latestStep}
              </p>
            )}
          </div>
        )}

        {status === 'complete' && data && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span
                className={`text-sm font-bold ${
                  data.inStock ? 'text-[var(--lego-green)]' : 'text-[var(--lego-red)]'
                }`}
              >
                {data.inStock ? '✓ IN STOCK' : '✗ Out of Stock'}
              </span>
              {data.inStock && data.price !== '0' && (
                <span className="font-bold text-[var(--lego-black)]">
                  {data.currency === 'USD' ? '$' : data.currency}
                  {data.price}
                </span>
              )}
            </div>
            {data.inStock && (
              <>
                <p className="text-xs text-[var(--lego-black)]/60">
                  {data.shipping}
                </p>
                <a
                  href={data.productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[var(--lego-blue)] hover:underline mt-1"
                >
                  View Product <ExternalLink className="w-3 h-3" />
                </a>
              </>
            )}
          </div>
        )}

        {status === 'error' && (
          <div className="text-sm text-[var(--lego-red)]">
            <div className="font-medium flex items-center gap-2">
              <X className="w-4 h-4" />
              Error
            </div>
            <p className="text-xs mt-1">{error || 'Failed to search'}</p>
          </div>
        )}

        {status === 'idle' && (
          <p className="text-sm text-[var(--lego-black)]/40">
            Waiting to start...
          </p>
        )}
      </div>
    </div>
  )
}

function StatusIcon({
  status,
  stockFound
}: {
  status: string
  stockFound?: boolean
}) {
  if (stockFound) {
    return (
      <div className="w-8 h-8 rounded-full bg-[var(--lego-yellow)] flex items-center justify-center animate-pulse-scale">
        <span className="text-lg">🎉</span>
      </div>
    )
  }

  switch (status) {
    case 'searching':
      return (
        <div className="w-8 h-8 rounded-full bg-[var(--lego-orange)]/20 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-[var(--lego-orange)] animate-spin" />
        </div>
      )
    case 'complete':
      return (
        <div className="w-8 h-8 rounded-full bg-[var(--lego-green)]/20 flex items-center justify-center">
          <Check className="w-5 h-5 text-[var(--lego-green)]" />
        </div>
      )
    case 'error':
      return (
        <div className="w-8 h-8 rounded-full bg-[var(--lego-red)]/20 flex items-center justify-center">
          <X className="w-5 h-5 text-[var(--lego-red)]" />
        </div>
      )
    default:
      return (
        <div className="w-8 h-8 rounded-full bg-[var(--lego-gray)] flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-[var(--lego-gray-dark)]" />
        </div>
      )
  }
}
