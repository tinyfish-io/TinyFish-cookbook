'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDiscoveryStore } from '@/lib/discovery-store'
import { AgentCard } from './agent-card'
import { AgentStatus, CompanyFindings } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Loader2,
  ArrowRight,
  ArrowDown,
  X,
  Globe,
  Users,
  FileText,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Puzzle,
  Zap,
} from 'lucide-react'

/**
 * Parse findings from a raw TinyFish SDK event.
 * Handles all possible shapes:
 * 1. { result: "```json\n{...}\n```" } — string wrapped in markdown fences
 * 2. { result: "{...}" } — plain JSON string
 * 3. { result: { overview: ... } } — already-parsed nested object
 * 4. { overview: ..., customerTypes: ... } — data at top level
 */
function parseFindings(data: Record<string, unknown>, companyName: string, companyUrl: string, companyDescription: string): CompanyFindings | null {
  // Try multiple possible locations for the result data (same pattern as dataset-finder)
  const candidates = [data.resultJson, data.result, data.data, data]

  for (const candidate of candidates) {
    if (!candidate) continue

    let parsed: unknown = candidate
    if (typeof parsed === 'string') {
      // Strip markdown code fences
      const cleaned = parsed
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      try {
        parsed = JSON.parse(cleaned)
      } catch {
        // Try to extract a JSON object from noisy output
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0])
          } catch {
            continue
          }
        } else {
          continue
        }
      }
    }

    if (!parsed || typeof parsed !== 'object') continue

    const p = parsed as Record<string, unknown>

    // Validate: must have at least one meaningful field
    if (!p.overview && !p.customerTypes && !p.caseStudies && !p.keyFeatures) continue

    return {
      companyName,
      website: companyUrl,
      overview: (p.overview as string) || companyDescription || '',
      customerTypes: Array.isArray(p.customerTypes) ? p.customerTypes : [],
      caseStudies: Array.isArray(p.caseStudies) ? p.caseStudies : [],
      testimonials: Array.isArray(p.testimonials) ? p.testimonials : [],
      pricingTiers: Array.isArray(p.pricingTiers) ? p.pricingTiers : [],
      keyFeatures: Array.isArray(p.keyFeatures) ? p.keyFeatures : [],
      integrations: Array.isArray(p.integrations) ? p.integrations : [],
    }
  }

  return null
}

export function AgentGrid() {
  const agentStatuses = useDiscoveryStore((s) => s.agentStatuses)
  const updateAgentStatus = useDiscoveryStore((s) => s.updateAgentStatus)

  const [liveViewAgent, setLiveViewAgent] = useState<AgentStatus | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<AgentStatus | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview', 'customerTypes']))

  // Track whether batch has been launched
  const batchLaunchedRef = useRef(false)

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  // Launch ALL agents via a single batch SSE connection (bypasses browser 6-connection limit)
  useEffect(() => {
    const idleAgents = agentStatuses.filter(a => a.status === 'idle')
    if (idleAgents.length === 0 || batchLaunchedRef.current) return

    batchLaunchedRef.current = true

    // Mark all agents as connecting immediately
    idleAgents.forEach(agent => {
      updateAgentStatus(agent.id, { status: 'connecting', progress: 10 })
    })

    const controller = new AbortController()
    const timeout = setTimeout(() => {
      controller.abort()
    }, 330000) // 5.5 min overall timeout

    const runBatch = async () => {
      try {
        const response = await fetch('/api/tinyfish-agents-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agents: idleAgents.map(a => ({ id: a.id, company: a.company })),
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Batch request failed' }))
          throw new Error(errorData.error || 'Failed to start agents')
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error('No response stream')

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                const agentId = data.agentId

                if (!agentId || agentId === '__batch__') continue

                // Custom events from our batch route
                if (data.type === 'CONNECTING') {
                  updateAgentStatus(agentId, { status: 'connecting', progress: 10 })
                }
                if (data.type === 'BROWSING') {
                  updateAgentStatus(agentId, { status: 'browsing', progress: 20 })
                }

                // SDK STARTED event
                if (data.type === 'STARTED') {
                  updateAgentStatus(agentId, { status: 'browsing', progress: 20 })
                }

                // SDK STREAMING_URL event (snake_case from SDK)
                if (data.type === 'STREAMING_URL' && data.streaming_url) {
                  updateAgentStatus(agentId, { liveViewUrl: data.streaming_url, progress: 30 })
                }

                // SDK PROGRESS event
                if (data.type === 'PROGRESS') {
                  updateAgentStatus(agentId, {
                    status: 'analyzing',
                    currentUrl: data.purpose || data.message || 'Processing...',
                    progress: Math.min(80, 30 + Math.random() * 40),
                  })
                }

                // Legacy STATUS event (kept for compatibility)
                if (data.type === 'STATUS') {
                  updateAgentStatus(agentId, {
                    status: 'analyzing',
                    currentUrl: data.message,
                    progress: Math.min(80, 30 + Math.random() * 40),
                  })
                }

                // SDK COMPLETE event — parse findings client-side
                if (data.type === 'COMPLETE') {
                  const companyName = data.companyName || ''
                  const companyUrl = data.companyUrl || ''
                  const companyDescription = data.companyDescription || ''

                  if (data.status === 'COMPLETED') {
                    const findings = parseFindings(data, companyName, companyUrl, companyDescription)
                    if (findings) {
                      updateAgentStatus(agentId, {
                        status: 'complete',
                        progress: 100,
                        findings,
                        liveViewUrl: undefined,
                      })
                    } else {
                      // COMPLETE but no parseable findings
                      updateAgentStatus(agentId, {
                        status: 'complete',
                        progress: 100,
                        findings: {
                          companyName,
                          website: companyUrl,
                          overview: companyDescription,
                          customerTypes: [],
                          caseStudies: [],
                          testimonials: [],
                          pricingTiers: [],
                          keyFeatures: [],
                          integrations: [],
                        },
                        liveViewUrl: undefined,
                      })
                    }
                  } else if (data.status === 'FAILED') {
                    updateAgentStatus(agentId, {
                      status: 'error',
                      error: data.error?.message || 'Agent failed',
                      progress: 0,
                      liveViewUrl: undefined,
                    })
                  }
                }

                // Legacy findings-based COMPLETE (kept for compatibility)
                if (data.findings && data.type !== 'COMPLETE') {
                  updateAgentStatus(agentId, {
                    status: 'complete',
                    progress: 100,
                    findings: data.findings,
                    liveViewUrl: undefined,
                  })
                }

                if (data.type === 'ERROR') {
                  updateAgentStatus(agentId, {
                    status: 'error',
                    error: data.error || data.message || 'Agent error',
                    progress: 0,
                    liveViewUrl: undefined,
                  })
                }
              } catch (parseError) {
                if (parseError instanceof SyntaxError) continue
              }
            }
          }
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          // Mark any still-connecting agents as errored
          agentStatuses.forEach(agent => {
            if (agent.status === 'connecting' || agent.status === 'browsing' || agent.status === 'analyzing') {
              updateAgentStatus(agent.id, {
                status: 'error',
                error: error instanceof Error ? error.message : 'Batch failed',
                progress: 0,
                liveViewUrl: undefined,
              })
            }
          })
        }
      } finally {
        clearTimeout(timeout)
      }
    }

    runBatch()

    return () => {
      clearTimeout(timeout)
    }
  }, [agentStatuses])

  const allDone = agentStatuses.length > 0 && agentStatuses.every(
    (a) => a.status === 'complete' || a.status === 'error'
  )
  const completedCount = agentStatuses.filter((a) => a.status === 'complete').length
  const hasResults = completedCount > 0
  const progress = agentStatuses.length > 0 ? (completedCount / agentStatuses.length) * 100 : 0

  const handleCardClick = (agent: AgentStatus) => {
    if (agent.status === 'complete') {
      setSelectedAgent(selectedAgent?.id === agent.id ? null : agent)
    }
  }

  const currentSelectedAgent = selectedAgent
    ? agentStatuses.find(a => a.id === selectedAgent.id) || selectedAgent
    : null

  return (
    <div className="flex-1 overflow-auto p-6 bg-gradient-to-br from-background via-background to-primary/[0.03]">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Agent Research</h2>
              {allDone ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
                  <CheckCircle2 className="w-5 h-5 text-success" />
                </motion.div>
              ) : (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {completedCount}/{agentStatuses.length} companies analyzed
            </p>
          </div>
        </motion.div>

        {/* Animated Progress Bar */}
        {!allDone && agentStatuses.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress: {completedCount} / {agentStatuses.length} agents</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2.5 bg-muted/50 rounded-full overflow-hidden backdrop-blur-sm border border-border/50">
              <motion.div
                className="h-full bg-gradient-to-r from-primary via-chart-2 to-success rounded-full relative overflow-hidden"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              >
                <div className="absolute inset-0 animate-shimmer" />
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Insights Available Banner */}
        <AnimatePresence>
          {hasResults && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary/10 via-chart-2/10 to-success/10 rounded-xl border border-primary/20 shadow-sm shadow-primary/5">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4.5 h-4.5 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Insights Available</p>
                  <p className="text-xs text-muted-foreground">
                    Click <span className="text-primary font-medium">Synthesis</span> or <span className="text-primary font-medium">Results</span> in the sidebar
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Agent Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {agentStatuses.map((agent, index) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: index * 0.06, duration: 0.4, ease: 'easeOut' }}
            >
              <AgentCard
                agent={agent}
                onViewLive={() => setLiveViewAgent(agent)}
                onClick={() => handleCardClick(agent)}
                isSelected={currentSelectedAgent?.id === agent.id}
              />
            </motion.div>
          ))}
        </div>

        {/* Selected Agent Details Heading */}
        <AnimatePresence>
          {currentSelectedAgent && currentSelectedAgent.findings && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex items-center gap-3 pt-2"
            >
              <ArrowDown className="w-5 h-5 text-primary animate-bounce" />
              <p className="text-sm font-medium text-primary">
                Showing detailed results for <span className="font-semibold">{currentSelectedAgent.company.name}</span> below
              </p>
              <div className="flex-1 h-px bg-gradient-to-r from-primary/30 to-transparent" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selected Agent Details Panel */}
        <AnimatePresence>
          {currentSelectedAgent && currentSelectedAgent.findings && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-primary/30 bg-gradient-to-br from-card via-card to-primary/[0.04] overflow-hidden shadow-lg shadow-primary/5">
                <CardHeader className="pb-3 bg-gradient-to-r from-primary/[0.06] to-transparent">
                  <div className="flex items-start justify-between gap-4 min-w-0">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{currentSelectedAgent.company.name}</CardTitle>
                      <a
                        href={currentSelectedAgent.company.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline break-all"
                      >
                        {currentSelectedAgent.company.url}
                      </a>
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setSelectedAgent(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 overflow-hidden">
                  {currentSelectedAgent.findings.overview && (
                    <DetailSection id="overview" icon={Globe} title="Overview" expanded={expandedSections.has('overview')} onToggle={() => toggleSection('overview')}>
                      <p className="text-sm text-muted-foreground break-words">{currentSelectedAgent.findings.overview}</p>
                    </DetailSection>
                  )}

                  {currentSelectedAgent.findings.customerTypes?.length > 0 && (
                    <DetailSection id="customerTypes" icon={Users} title={`Customer Types (${currentSelectedAgent.findings.customerTypes.length})`} expanded={expandedSections.has('customerTypes')} onToggle={() => toggleSection('customerTypes')}>
                      <div className="flex flex-wrap gap-2">
                        {currentSelectedAgent.findings.customerTypes.map((type, i) => (
                          <Badge key={i} variant="secondary" className="bg-primary/10 text-primary border border-primary/20">{type}</Badge>
                        ))}
                      </div>
                    </DetailSection>
                  )}

                  {currentSelectedAgent.findings.keyFeatures?.length > 0 && (
                    <DetailSection id="keyFeatures" icon={Zap} title={`Key Features (${currentSelectedAgent.findings.keyFeatures.length})`} expanded={expandedSections.has('keyFeatures')} onToggle={() => toggleSection('keyFeatures')}>
                      <ul className="space-y-2">
                        {currentSelectedAgent.findings.keyFeatures.map((feature, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2 min-w-0">
                            <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                            <span className="break-words">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </DetailSection>
                  )}

                  {currentSelectedAgent.findings.caseStudies?.length > 0 && (
                    <DetailSection id="caseStudies" icon={FileText} title={`Case Studies (${currentSelectedAgent.findings.caseStudies.length})`} expanded={expandedSections.has('caseStudies')} onToggle={() => toggleSection('caseStudies')}>
                      <div className="space-y-3">
                        {currentSelectedAgent.findings.caseStudies.map((cs, i) => (
                          <div key={i} className="p-3 bg-gradient-to-r from-muted/50 to-muted/30 rounded-lg min-w-0 border border-border/50">
                            <p className="text-sm font-medium break-words">{cs.customer}</p>
                            <p className="text-xs text-muted-foreground break-words">{cs.industry}</p>
                            <p className="text-xs mt-1 break-words">{cs.summary}</p>
                          </div>
                        ))}
                      </div>
                    </DetailSection>
                  )}

                  {currentSelectedAgent.findings.testimonials?.length > 0 && (
                    <DetailSection id="testimonials" icon={MessageSquare} title={`Testimonials (${currentSelectedAgent.findings.testimonials.length})`} expanded={expandedSections.has('testimonials')} onToggle={() => toggleSection('testimonials')}>
                      <div className="space-y-3">
                        {currentSelectedAgent.findings.testimonials.map((t, i) => (
                          <div key={i} className="p-3 bg-gradient-to-r from-muted/50 to-muted/30 rounded-lg min-w-0 border border-border/50">
                            <p className="text-sm italic break-words">&ldquo;{t.quote}&rdquo;</p>
                            <p className="text-xs text-muted-foreground mt-2 break-words">
                              &mdash; {t.author}{t.role && `, ${t.role}`}{t.company && ` at ${t.company}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    </DetailSection>
                  )}

                  {currentSelectedAgent.findings.pricingTiers?.length > 0 && (
                    <DetailSection id="pricingTiers" icon={DollarSign} title={`Pricing Tiers (${currentSelectedAgent.findings.pricingTiers.length})`} expanded={expandedSections.has('pricingTiers')} onToggle={() => toggleSection('pricingTiers')}>
                      <div className="space-y-2">
                        {currentSelectedAgent.findings.pricingTiers.map((tier, i) => (
                          <div key={i} className="p-2.5 bg-gradient-to-r from-warning/5 to-muted/30 rounded-md text-sm break-words border border-warning/10">
                            {tier}
                          </div>
                        ))}
                      </div>
                    </DetailSection>
                  )}

                  {currentSelectedAgent.findings.integrations?.length > 0 && (
                    <DetailSection id="integrations" icon={Puzzle} title={`Integrations (${currentSelectedAgent.findings.integrations.length})`} expanded={expandedSections.has('integrations')} onToggle={() => toggleSection('integrations')}>
                      <div className="flex flex-wrap gap-2">
                        {currentSelectedAgent.findings.integrations.map((int, i) => (
                          <Badge key={i} variant="outline" className="bg-accent/50 break-words whitespace-normal max-w-full border-accent-foreground/20">{int}</Badge>
                        ))}
                      </div>
                    </DetailSection>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Live View Modal */}
      {liveViewAgent && (
        <Dialog open={!!liveViewAgent} onOpenChange={() => setLiveViewAgent(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Live View: {liveViewAgent?.company.name}</DialogTitle>
            </DialogHeader>
            {liveViewAgent?.liveViewUrl && (
              <div className="aspect-video bg-muted rounded-md overflow-hidden">
                <iframe
                  src={liveViewAgent.liveViewUrl}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin"
                  title={`Live view of ${liveViewAgent.company.name}`}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function DetailSection({
  id, icon: Icon, title, expanded, onToggle, children,
}: {
  id: string; icon: React.ElementType; title: string; expanded: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div className="border-b border-border/50 pb-4 overflow-hidden">
      <button type="button" className="flex items-center justify-between w-full text-left group" onClick={onToggle}>
        <h4 className="text-sm font-medium flex items-center gap-2 group-hover:text-primary transition-colors">
          <Icon className="w-4 h-4 text-primary shrink-0" />
          {title}
        </h4>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
