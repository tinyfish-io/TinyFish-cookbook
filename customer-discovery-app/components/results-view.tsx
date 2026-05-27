'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDiscoveryStore } from '@/lib/discovery-store'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Users,
  Target,
  Lightbulb,
  Building2,
  RefreshCw,
  CheckCircle2,
  Download,
  Globe,
} from 'lucide-react'

export function ResultsView() {
  const {
    seedCompany,
    companyProfile,
    customerSegments,
    insights,
    agentStatuses,
    reset,
  } = useDiscoveryStore()

  const [activeTab, setActiveTab] = useState('segments')
  const completedAgents = agentStatuses.filter((a) => a.status === 'complete')

  // Generate CSV content
  const downloadCSV = () => {
    const rows: string[][] = []

    // Header
    rows.push(['Customer Discovery Report'])
    rows.push(['Generated for:', seedCompany?.name || '', seedCompany?.url || ''])
    rows.push([])

    // Company Profile
    if (companyProfile) {
      rows.push(['COMPANY PROFILE'])
      rows.push(['Industry:', companyProfile.industry])
      rows.push(['Positioning:', companyProfile.positioning])
      rows.push(['Target Market:', companyProfile.targetMarket])
      rows.push([])
    }

    // Customer Segments
    rows.push(['CUSTOMER SEGMENTS'])
    rows.push(['Segment Name', 'Description', 'Characteristics', 'Buying Signals', 'Example Companies'])
    customerSegments.forEach((segment) => {
      rows.push([
        segment.name,
        segment.description,
        (segment.characteristics || []).join('; '),
        (segment.signals || []).join('; '),
        (segment.companyExamples || []).join('; '),
      ])
    })
    rows.push([])

    // Strategic Insights
    rows.push(['STRATEGIC INSIGHTS'])
    insights.forEach((insight, i) => {
      rows.push([`${i + 1}. ${insight}`])
    })
    rows.push([])

    // Research Sources
    rows.push(['RESEARCH SOURCES'])
    rows.push(['Company', 'URL', 'Customer Types', 'Case Studies', 'Testimonials'])
    completedAgents.forEach((agent) => {
      rows.push([
        agent.company.name,
        agent.company.url,
        agent.findings?.customerTypes?.join('; ') || '',
        String(agent.findings?.caseStudies?.length || 0),
        String(agent.findings?.testimonials?.length || 0),
      ])
    })

    // Convert to CSV string
    const csvContent = rows.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n')

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `customer-discovery-${seedCompany?.name?.toLowerCase().replace(/\s+/g, '-') || 'report'}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex-1 p-6 overflow-auto bg-gradient-to-br from-background via-background to-success/[0.03]">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-start justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Discovery Results</h1>
            <p className="text-muted-foreground mt-1">
              Customer segments for companies like {seedCompany?.name}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadCSV}>
              <Download className="w-4 h-4 mr-2" />
              Download CSV
            </Button>
            <Button variant="outline" onClick={reset}>
              <RefreshCw className="w-4 h-4 mr-2" />
              New Discovery
            </Button>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-muted/50">
            <TabsTrigger 
              value="profile" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Building2 className="w-4 h-4 mr-2" />
              Company Profile
            </TabsTrigger>
            <TabsTrigger 
              value="segments"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Users className="w-4 h-4 mr-2" />
              Customer Segments
            </TabsTrigger>
            <TabsTrigger 
              value="sources"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Globe className="w-4 h-4 mr-2" />
              Research Sources
            </TabsTrigger>
          </TabsList>

          {/* Company Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            {companyProfile && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <Card className="border-primary/20">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-primary" />
                      <CardTitle>{seedCompany?.name} Profile</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid gap-6 md:grid-cols-3">
                      {[
                        { label: 'Industry', value: companyProfile.industry },
                        { label: 'Positioning', value: companyProfile.positioning },
                        { label: 'Target Market', value: companyProfile.targetMarket },
                      ].map((item, i) => (
                        <motion.div
                          key={item.label}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 + i * 0.1, duration: 0.3 }}
                          className="p-4 bg-muted/30 rounded-lg"
                        >
                          <p className="text-sm font-medium text-muted-foreground mb-1">
                            {item.label}
                          </p>
                          <p className="font-medium">{item.value}</p>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </TabsContent>

          {/* Customer Segments Tab */}
          <TabsContent value="segments" className="space-y-6">
            {/* Customer Segments */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Customer Segments</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {customerSegments.map((segment, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 15, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: index * 0.08, duration: 0.35 }}
                  >
                  <Card className="border-l-4 border-l-primary h-full">
                    <CardHeader>
                      <CardTitle className="text-lg">{segment.name}</CardTitle>
                      <CardDescription>{segment.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {segment.characteristics && segment.characteristics.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Characteristics</p>
                          <ul className="space-y-1">
                            {segment.characteristics.map((char, i) => (
                              <li
                                key={i}
                                className="text-sm text-muted-foreground flex items-start gap-2"
                              >
                                <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                                {char}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {segment.signals && segment.signals.length > 0 && (
                        <div className="min-w-0">
                          <p className="text-sm font-medium mb-2 flex items-center gap-1">
                            <Target className="w-4 h-4 text-primary" />
                            Buying Signals
                          </p>
                          <ul className="space-y-1">
                            {segment.signals.map((signal, i) => (
                              <li
                                key={i}
                                className="text-sm text-muted-foreground flex items-start gap-2 min-w-0"
                              >
                                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <span className="break-words">{signal}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {segment.companyExamples && segment.companyExamples.length > 0 && (
                        <div className="min-w-0">
                          <p className="text-sm font-medium mb-2">Example Companies</p>
                          <p className="text-sm text-muted-foreground break-words">
                            {segment.companyExamples.join(', ')}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Strategic Insights */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <Card className="border-warning/20">
                <CardHeader className="bg-gradient-to-r from-warning/10 to-transparent">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-warning" />
                    <CardTitle>Strategic Insights</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <ul className="space-y-3">
                    {insights.map((insight, index) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + index * 0.08, duration: 0.3 }}
                        className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                      >
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-warning text-warning-foreground text-sm flex items-center justify-center font-medium">
                          {index + 1}
                        </span>
                        <p className="text-sm">{insight}</p>
                      </motion.li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Research Sources Tab */}
          <TabsContent value="sources" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Research Sources</h2>
              </div>
              <Badge variant="secondary" className="bg-success/10 text-success">
                {completedAgents.length} companies analyzed
              </Badge>
            </div>

            <div className="space-y-3">
              {completedAgents.map((agent, index) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06, duration: 0.3 }}
                >
                <Card className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{agent.company.name}</p>
                            <a
                              href={agent.company.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline"
                            >
                              Visit site
                            </a>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 break-words">
                            {agent.company.description}
                          </p>
                        </div>
                        <div className="flex gap-4 text-right shrink-0">
                          <div>
                            <p className="text-2xl font-bold text-primary">
                              {agent.findings?.caseStudies?.length ?? 0}
                            </p>
                            <p className="text-xs text-muted-foreground">Case Studies</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-success">
                              {agent.findings?.testimonials?.length ?? 0}
                            </p>
                            <p className="text-xs text-muted-foreground">Testimonials</p>
                          </div>
                        </div>
                      </div>
                      {agent.findings?.customerTypes && agent.findings.customerTypes.length > 0 && (
                        <div className="pt-3 border-t border-border">
                          <p className="text-xs text-muted-foreground mb-2">Customer types found:</p>
                          <div className="flex flex-wrap gap-1">
                            {agent.findings.customerTypes.slice(0, 3).map((type, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {type}
                              </Badge>
                            ))}
                            {agent.findings.customerTypes.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{agent.findings.customerTypes.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
