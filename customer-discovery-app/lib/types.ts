export interface SeedCompany {
  name: string
  url: string
}

export interface SimilarCompany {
  name: string
  url: string
  description: string
  industry: string
  targetAudience: string
}

export interface AgentStatus {
  id: string
  company: SimilarCompany
  status: 'idle' | 'connecting' | 'browsing' | 'analyzing' | 'complete' | 'error'
  sessionId?: string
  liveViewUrl?: string
  currentUrl?: string
  progress: number
  findings?: CompanyFindings
  error?: string
}

export interface CompanyFindings {
  companyName: string
  website: string
  overview: string
  customerTypes: string[]
  caseStudies: CaseStudy[]
  testimonials: Testimonial[]
  pricingTiers: string[]
  keyFeatures: string[]
  integrations: string[]
}

export interface CaseStudy {
  customer: string
  industry: string
  summary: string
}

export interface Testimonial {
  quote: string
  author: string
  company: string
  role?: string
}

export interface CustomerSegment {
  name: string
  description: string
  characteristics: string[]
  companyExamples: string[]
  signals: string[]
}

export interface DiscoveryResults {
  seedCompany: SeedCompany
  companyProfile: {
    industry: string
    positioning: string
    targetMarket: string
  }
  similarCompanies: SimilarCompany[]
  agentStatuses: AgentStatus[]
  customerSegments: CustomerSegment[]
  insights: string[]
}
