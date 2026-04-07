export interface StreamingPlatform {
  id: string
  name: string
  url: string
  logo?: string
}

export interface PlatformSearchResult {
  platformId: string
  platformName: string
  status: 'pending' | 'searching' | 'found' | 'not_found' | 'error'
  streamingUrl?: string
  message?: string
  available?: boolean
  watchUrl?: string
  subscriptionRequired?: boolean
  region?: string
}

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

export const STREAMING_PLATFORMS: StreamingPlatform[] = [
  { id: 'crunchyroll', name: 'Crunchyroll', url: 'https://www.crunchyroll.com' },
  { id: 'netflix', name: 'Netflix', url: 'https://www.netflix.com' },
  { id: 'prime', name: 'Prime Video', url: 'https://www.amazon.com/Prime-Video' },
  { id: 'hulu', name: 'Hulu', url: 'https://www.hulu.com' },
  { id: 'funimation', name: 'Funimation', url: 'https://www.funimation.com' },
  { id: 'hidive', name: 'HIDIVE', url: 'https://www.hidive.com' },
  { id: 'disney', name: 'Disney+', url: 'https://www.disneyplus.com' },
  { id: 'hbomax', name: 'Max', url: 'https://www.max.com' },
]
