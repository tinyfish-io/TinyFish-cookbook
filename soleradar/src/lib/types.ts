export interface SneakerDrop {
  'Sneaker Name': string
  'Brand': string
  'Size': string
  'Colorway': string
  'Region / Country': string
  'Stock Status': string
  'Price': string
  'Release Time / Restock Time': string
  'Website': string
  'Purchase Link': string
  'Notes': string
  _qualityScore?: number
  _agentSite?: string
}

export interface AgentState {
  site: string
  url: string
  status: 'pending' | 'running' | 'done' | 'error'
  statusMsg: string
  results: SneakerDrop[]
  startedAt?: number
}

export interface SearchParams {
  sneakerName: string
  size: string
  colorway: string
  region: string
  currency: string
}
