export interface Resource {
  id: string
  name: string
  url: string
  description: string
  tags: string[]
  stars: number | null
  starsDisplay: string
  score: number
  category: string
  subcategory: string
  sourceRepo: string
  crossRefs: string[]
}

export interface AgentState {
  repoUrl: string
  repoName: string
  status: 'pending' | 'running' | 'done' | 'error'
  statusText: string
  resourceCount: number
  error?: string
}

export interface ScrapedRepo {
  repoName: string
  description: string
  stars: number
  lastUpdated: string
  categories: ScrapedCategory[]
  totalResources: number
}

export interface ScrapedCategory {
  name: string
  subcategories: ScrapedSubcategory[]
}

export interface ScrapedSubcategory {
  name: string
  resources: ScrapedResource[]
}

export interface ScrapedResource {
  name: string
  url: string
  description: string
  tags: string[]
}

export interface CategoryMap {
  [category: string]: {
    [subcategory: string]: Resource[]
  }
}
