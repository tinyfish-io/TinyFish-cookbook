'use client'

import React from "react"
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useDiscoveryStore } from '@/lib/discovery-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ArrowRight, Building2, Globe, Loader2, Sparkles, Search } from 'lucide-react'

export function SeedInputForm() {
  const [companyName, setCompanyName] = useState('')
  const [companyUrl, setCompanyUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const {
    setSeedCompany,
    setCompanyProfile,
    setSimilarCompanies,
    initializeAgents,
    setPhase,
    setError,
  } = useDiscoveryStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!companyName.trim() || !companyUrl.trim()) {
      setError('Please enter both company name and URL')
      return
    }

    let url = companyUrl.trim()
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`
    }

    try {
      new URL(url)
    } catch {
      setError('Please enter a valid URL')
      return
    }

    setIsLoading(true)
    setError(null)
    setSeedCompany({ name: companyName.trim(), url })
    setPhase('analyzing')

    try {
      const response = await fetch('/api/analyze-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          companyUrl: url,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to analyze company')
      }

      const data = await response.json()

      setCompanyProfile(data.companyProfile)
      setSimilarCompanies(data.similarCompanies)
      initializeAgents(data.similarCompanies)
      setPhase('researching')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
      setPhase('input')
    } finally {
      setIsLoading(false)
    }
  }

  const examples = [
    { name: 'Stripe', url: 'stripe.com' },
    { name: 'Notion', url: 'notion.so' },
    { name: 'Figma', url: 'figma.com' },
    { name: 'Vercel', url: 'vercel.com' },
  ]

  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-background via-primary/[0.02] to-chart-2/[0.04] relative overflow-hidden">
      {/* Decorative background circles */}
      <div className="absolute top-1/4 -left-32 w-64 h-64 rounded-full bg-primary/[0.04] blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-64 h-64 rounded-full bg-chart-2/[0.04] blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-success/[0.02] blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-lg relative z-10"
      >
        <Card className="border-border/50 shadow-xl shadow-primary/10 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mx-auto mb-4"
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary via-chart-2 to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30">
                  <Search className="w-8 h-8 text-primary-foreground" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-success to-chart-2 flex items-center justify-center shadow-md">
                  <Sparkles className="w-3.5 h-3.5 text-success-foreground" />
                </div>
              </div>
            </motion.div>
            <CardTitle className="text-2xl bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">Start Your Discovery</CardTitle>
            <CardDescription className="mt-2">
              Enter a company to find similar businesses and discover their customer segments using AI-powered research agents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-2"
              >
                <Label htmlFor="company-name">Company Name</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="company-name"
                    placeholder="e.g., Stripe"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="pl-10 h-11 transition-shadow focus:shadow-md focus:shadow-primary/10"
                    disabled={isLoading}
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-2"
              >
                <Label htmlFor="company-url">Website URL</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="company-url"
                    placeholder="e.g., stripe.com"
                    value={companyUrl}
                    onChange={(e) => setCompanyUrl(e.target.value)}
                    className="pl-10 h-11 transition-shadow focus:shadow-md focus:shadow-primary/10"
                    disabled={isLoading}
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Button
                  type="submit"
                  className="w-full h-12 text-base bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      Start Discovery
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </motion.div>
            </form>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-8 pt-6 border-t border-border"
            >
              <p className="text-sm text-muted-foreground text-center mb-4">
                Try these examples:
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {examples.map((example, i) => (
                  <motion.div
                    key={example.name}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8 + i * 0.1 }}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCompanyName(example.name)
                        setCompanyUrl(example.url)
                      }}
                      disabled={isLoading}
                      className="hover:border-primary/50 hover:bg-primary/5 transition-all"
                    >
                      {example.name}
                    </Button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
