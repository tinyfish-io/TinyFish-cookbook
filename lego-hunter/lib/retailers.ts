export interface RetailerConfig {
  name: string
  logo: string
  baseSearchUrl: string
  searchQueryParam: string
}

export const DEFAULT_RETAILERS: RetailerConfig[] = [
  {
    name: 'LEGO Store',
    logo: '🧱',
    baseSearchUrl: 'https://www.lego.com/en-us/search',
    searchQueryParam: 'q'
  },
  {
    name: 'Amazon',
    logo: '📦',
    baseSearchUrl: 'https://www.amazon.com/s',
    searchQueryParam: 'k'
  },
  {
    name: 'Target',
    logo: '🎯',
    baseSearchUrl: 'https://www.target.com/s',
    searchQueryParam: 'searchTerm'
  },
  {
    name: 'Walmart',
    logo: '🛒',
    baseSearchUrl: 'https://www.walmart.com/search',
    searchQueryParam: 'q'
  },
  {
    name: 'BrickLink',
    logo: '🔗',
    baseSearchUrl: 'https://www.bricklink.com/v2/search.page',
    searchQueryParam: 'q'
  },
  {
    name: 'Zavvi',
    logo: '🎮',
    baseSearchUrl: 'https://www.zavvi.com/elysium.search',
    searchQueryParam: 'search'
  },
  {
    name: 'Toys R Us',
    logo: '🦒',
    baseSearchUrl: 'https://www.toysrus.com/search',
    searchQueryParam: 'q'
  },
  {
    name: 'Barnes & Noble',
    logo: '📚',
    baseSearchUrl: 'https://www.barnesandnoble.com/s/',
    searchQueryParam: ''
  },
  {
    name: 'Kohls',
    logo: '🏬',
    baseSearchUrl: 'https://www.kohls.com/search.jsp',
    searchQueryParam: 'search'
  },
  {
    name: 'Best Buy',
    logo: '💻',
    baseSearchUrl: 'https://www.bestbuy.com/site/searchpage.jsp',
    searchQueryParam: 'st'
  },
  {
    name: 'GameStop',
    logo: '🎮',
    baseSearchUrl: 'https://www.gamestop.com/search/',
    searchQueryParam: 'q'
  },
  {
    name: 'Smyths Toys',
    logo: '🧸',
    baseSearchUrl: 'https://www.smythstoys.com/uk/en-gb/search/',
    searchQueryParam: 'text'
  },
  {
    name: 'John Lewis',
    logo: '🛍️',
    baseSearchUrl: 'https://www.johnlewis.com/search',
    searchQueryParam: 'search-term'
  },
  {
    name: 'Argos',
    logo: '🔵',
    baseSearchUrl: 'https://www.argos.co.uk/search/',
    searchQueryParam: ''
  },
  {
    name: 'Entertainment Earth',
    logo: '🌍',
    baseSearchUrl: 'https://www.entertainmentearth.com/s/',
    searchQueryParam: ''
  }
]

export function buildSearchUrl(retailer: RetailerConfig, searchTerm: string): string {
  const encodedTerm = encodeURIComponent(searchTerm)

  // Handle special cases where the search term is part of the path
  if (!retailer.searchQueryParam) {
    return `${retailer.baseSearchUrl}${encodedTerm}`
  }

  const url = new URL(retailer.baseSearchUrl)
  url.searchParams.set(retailer.searchQueryParam, searchTerm)
  return url.toString()
}

// Get a simple list of retailer names
export function getRetailerNames(): string[] {
  return DEFAULT_RETAILERS.map(r => r.name)
}
