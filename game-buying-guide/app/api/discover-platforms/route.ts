import { NextResponse } from 'next/server'

// Curated list of trusted gaming platforms with search URL patterns
const GAMING_PLATFORMS = [
  {
    name: 'Steam',
    searchUrl: (query: string) => `https://store.steampowered.com/search/?term=${encodeURIComponent(query)}`,
    icon: 'steam',
  },
  {
    name: 'Epic Games Store',
    searchUrl: (query: string) => `https://store.epicgames.com/en-US/browse?q=${encodeURIComponent(query)}`,
    icon: 'epic',
  },
  {
    name: 'GOG',
    searchUrl: (query: string) => `https://www.gog.com/en/games?query=${encodeURIComponent(query)}`,
    icon: 'gog',
  },
  {
    name: 'PlayStation Store',
    searchUrl: (query: string) => `https://store.playstation.com/en-us/search/${encodeURIComponent(query)}`,
    icon: 'playstation',
  },
  {
    name: 'Xbox Store',
    searchUrl: (query: string) => `https://www.xbox.com/en-US/search?q=${encodeURIComponent(query)}`,
    icon: 'xbox',
  },
  {
    name: 'Nintendo eShop',
    searchUrl: (query: string) => `https://www.nintendo.com/us/search/#q=${encodeURIComponent(query)}`,
    icon: 'nintendo',
  },
  {
    name: 'Humble Bundle',
    searchUrl: (query: string) => `https://www.humblebundle.com/store/search?search=${encodeURIComponent(query)}`,
    icon: 'humble',
  },
  {
    name: 'Green Man Gaming',
    searchUrl: (query: string) => `https://www.greenmangaming.com/search/?query=${encodeURIComponent(query)}`,
    icon: 'gmg',
  },
  {
    name: 'Fanatical',
    searchUrl: (query: string) => `https://www.fanatical.com/en/search?search=${encodeURIComponent(query)}`,
    icon: 'fanatical',
  },
  {
    name: 'CDKeys',
    searchUrl: (query: string) => `https://www.cdkeys.com/catalogsearch/result/?q=${encodeURIComponent(query)}`,
    icon: 'cdkeys',
  },
]

export async function POST(request: Request) {
  try {
    const { gameTitle } = await request.json()

    if (!gameTitle) {
      return NextResponse.json({ error: 'Game title is required' }, { status: 400 })
    }

    // Generate platform URLs for the game
    const platforms = GAMING_PLATFORMS.map((platform) => ({
      name: platform.name,
      url: platform.searchUrl(gameTitle),
    }))

    return NextResponse.json({ platforms })
  } catch (error) {
    console.error('Error in discover-platforms:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
