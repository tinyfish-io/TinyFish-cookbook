import { create } from 'zustand'
import {
  SeedCompany,
  SimilarCompany,
  AgentStatus,
  CustomerSegment,
  CompanyFindings,
} from './types'

export type DiscoveryPhase =
  | 'input'
  | 'analyzing'
  | 'discovering'
  | 'researching'
  | 'synthesizing'
  | 'complete'

export type ViewMode = 'agents' | 'synthesis' | 'results'

interface DiscoveryState {
  phase: DiscoveryPhase
  viewMode: ViewMode
  seedCompany: SeedCompany | null
  companyProfile: {
    industry: string
    positioning: string
    targetMarket: string
  } | null
  similarCompanies: SimilarCompany[]
  agentStatuses: AgentStatus[]
  customerSegments: CustomerSegment[]
  insights: string[]
  error: string | null

  // Actions
  setPhase: (phase: DiscoveryPhase) => void
  setViewMode: (viewMode: ViewMode) => void
  setSeedCompany: (company: SeedCompany) => void
  setCompanyProfile: (profile: {
    industry: string
    positioning: string
    targetMarket: string
  }) => void
  setSimilarCompanies: (companies: SimilarCompany[]) => void
  initializeAgents: (companies: SimilarCompany[]) => void
  updateAgentStatus: (id: string, update: Partial<AgentStatus>) => void
  setCustomerSegments: (segments: CustomerSegment[]) => void
  setInsights: (insights: string[]) => void
  setError: (error: string | null) => void
  reset: () => void
}

const initialState = {
  phase: 'input' as DiscoveryPhase,
  viewMode: 'agents' as ViewMode,
  seedCompany: null,
  companyProfile: null,
  similarCompanies: [],
  agentStatuses: [],
  customerSegments: [],
  insights: [],
  error: null,
}

export const useDiscoveryStore = create<DiscoveryState>((set) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),

  setViewMode: (viewMode) => set({ viewMode }),

  setSeedCompany: (company) => set({ seedCompany: company }),

  setCompanyProfile: (profile) => set({ companyProfile: profile }),

  setSimilarCompanies: (companies) => set({ similarCompanies: companies }),

  initializeAgents: (companies) =>
    set({
      agentStatuses: companies.map((company, index) => ({
        id: `agent-${index}`,
        company,
        status: 'idle',
        progress: 0,
      })),
    }),

  updateAgentStatus: (id, update) =>
    set((state) => ({
      agentStatuses: state.agentStatuses.map((agent) =>
        agent.id === id ? { ...agent, ...update } : agent
      ),
    })),

  setCustomerSegments: (segments) => set({ customerSegments: segments }),

  setInsights: (insights) => set({ insights }),

  setError: (error) => set({ error }),

  reset: () => set(initialState),
}))

// Helper to get all completed findings
export function getCompletedFindings(agentStatuses: AgentStatus[]): CompanyFindings[] {
  return agentStatuses
    .filter((agent) => agent.status === 'complete' && agent.findings)
    .map((agent) => agent.findings as CompanyFindings)
}
