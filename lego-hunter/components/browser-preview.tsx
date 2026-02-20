'use client'

import { useEffect, useRef, useState } from 'react'

interface BrowserPreviewProps {
  streamingUrl?: string
  retailerName: string
  status: 'idle' | 'searching' | 'complete' | 'error'
}

export function BrowserPreview({
  streamingUrl,
  retailerName,
  status
}: BrowserPreviewProps) {
  const [isInView, setIsInView] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Lazy load using IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-[var(--lego-gray)] rounded-lg overflow-hidden border-2 border-[var(--lego-gray-dark)]"
    >
      {isInView && streamingUrl ? (
        <>
          <iframe
            src={streamingUrl}
            className={`w-full h-full border-0 transition-opacity duration-500 ${
              hasLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setHasLoaded(true)}
            title={`Browser preview for ${retailerName}`}
            sandbox="allow-same-origin allow-scripts"
          />
          {!hasLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <LoadingBricks />
            </div>
          )}
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          {status === 'idle' && (
            <>
              <div className="text-4xl">🧱</div>
              <span className="text-sm text-[var(--lego-black)]/60">
                Ready to search
              </span>
            </>
          )}
          {status === 'searching' && <LoadingBricks />}
          {status === 'complete' && (
            <>
              <div className="text-4xl">✅</div>
              <span className="text-sm text-[var(--lego-green)]">Complete</span>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="text-4xl">❌</div>
              <span className="text-sm text-[var(--lego-red)]">Failed</span>
            </>
          )}
        </div>
      )}

      {/* Status overlay */}
      {status === 'searching' && streamingUrl && (
        <div className="absolute top-2 right-2 bg-[var(--lego-orange)] text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse">
          LIVE
        </div>
      )}
    </div>
  )
}

function LoadingBricks() {
  return (
    <div className="flex gap-1">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="w-4 h-4 bg-[var(--lego-yellow)] rounded-sm lego-loading"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  )
}
