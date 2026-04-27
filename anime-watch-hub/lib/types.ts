export interface TinyFishAgentState {
  platformId: string
  platformName: string
  url: string
  status: 'idle' | 'connecting' | 'browsing' | 'complete' | 'error'
  streamingUrl?: string
  statusMessage?: string
  result?: {
    available: boolean
    watchUrl?: string
    subscriptionRequired?: boolean
    region?: string
    message?: string
  }
}
