'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useDiscoveryStore } from '@/lib/discovery-store'
import { useAutoSynthesis } from '@/hooks/use-auto-synthesis'
import { AppSidebar } from '@/components/app-sidebar'
import { SeedInputForm } from '@/components/seed-input-form'
import { AgentGrid } from '@/components/agent-grid'
import { ResultsView } from '@/components/results-view'
import { SynthesisView } from '@/components/synthesis-view'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  const { phase, viewMode, error, setError } = useDiscoveryStore()

  useAutoSynthesis()

  const renderContent = () => {
    if (phase === 'input') return <SeedInputForm key="input" />

    if (phase === 'analyzing') {
      return (
        <motion.div
          key="analyzing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex-1 flex items-center justify-center bg-gradient-to-br from-background via-primary/[0.02] to-success/[0.03]"
        >
          <div className="text-center space-y-6">
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <div className="absolute inset-3 rounded-full border-4 border-chart-2/20" />
              <div className="absolute inset-3 rounded-full border-4 border-chart-2 border-b-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
              <div className="absolute inset-6 rounded-full border-4 border-success/20" />
              <div className="absolute inset-6 rounded-full border-4 border-success border-t-transparent animate-spin" style={{ animationDuration: '2s' }} />
            </div>
            <div>
              <p className="text-lg font-medium bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">Analyzing Company</p>
              <p className="text-sm text-muted-foreground mt-1">
                Finding similar businesses and building research plan...
              </p>
            </div>
          </div>
        </motion.div>
      )
    }

    if (phase === 'researching' || phase === 'synthesizing' || phase === 'complete') {
      if (viewMode === 'agents') return <AgentGrid key="agents" />
      if (viewMode === 'synthesis') return <SynthesisView key="synthesis" />
      if (viewMode === 'results') return <ResultsView key="results" />
    }

    return null
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Alert variant="destructive" className="m-4 mb-0">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex-1">{error}</AlertDescription>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setError(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>
      </main>
    </div>
  )
}
