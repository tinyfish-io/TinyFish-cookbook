export interface Platform {
  name: string
  url: string
}

export interface AgentStatus {
  platformName: string
  url: string
  status: 'pending' | 'running' | 'complete' | 'error'
  currentAction?: string
  streamingUrl?: string
  result?: PlatformAnalysis
  error?: string
}

export interface PlatformAnalysis {
  platform_name: string
  store_url: string
  current_price: string
  original_price?: string
  discount_percentage?: string
  is_on_sale: boolean
  sale_ends?: string
  user_rating?: string
  review_count?: string
  recommendation: 'buy_now' | 'wait' | 'consider'
  reasoning: string
  pros: string[]
  cons: string[]
}

export interface GeminiPlatformResponse {
  platforms: Platform[]
}

export interface SteamDBPriceHistory {
  game_name: string
  historic_lowest_price: string
  historic_lowest_date?: string
  historic_lowest_discount?: string
  current_steam_price?: string
  current_discount?: string
  is_current_historic_low: boolean
  recommendation: string
}

export interface SteamDBAgentStatus {
  status: 'pending' | 'running' | 'complete' | 'error'
  currentAction?: string
  streamingUrl?: string
  result?: SteamDBPriceHistory
  error?: string
}
