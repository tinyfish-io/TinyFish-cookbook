import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

const REGION_SITES: Record<string, { name: string; url: string }[]> = {
  singapore: [
    { name: 'Novelship', url: 'https://novelship.com' },
    { name: 'KicksCrew', url: 'https://www.kickscrew.com' },
    { name: 'SOLE WHAT', url: 'https://solewhat.com' },
    { name: 'Sneak Avenues', url: 'https://sneakavenues.com' },
    { name: 'StockX', url: 'https://stockx.com' },
    { name: 'KLEKT', url: 'https://www.klekt.com' },
    { name: 'Foot Locker SG', url: 'https://www.footlocker.com.sg' },
    { name: 'Nike SG', url: 'https://www.nike.com/sg' },
    { name: 'Adidas SG', url: 'https://www.adidas.com.sg' },
  ],
  'united states': [
    { name: 'StockX', url: 'https://stockx.com' },
    { name: 'GOAT', url: 'https://www.goat.com' },
    { name: 'Foot Locker', url: 'https://www.footlocker.com' },
    { name: 'Nike US', url: 'https://www.nike.com' },
    { name: 'Adidas US', url: 'https://www.adidas.com' },
    { name: 'Flight Club', url: 'https://www.flightclub.com' },
    { name: 'Stadium Goods', url: 'https://www.stadiumgoods.com' },
    { name: 'Champs Sports', url: 'https://www.champssports.com' },
    { name: 'Shoe Palace', url: 'https://www.shoepalace.com' },
  ],
  'united kingdom': [
    { name: 'END. Clothing', url: 'https://www.endclothing.com' },
    { name: 'KLEKT', url: 'https://www.klekt.com' },
    { name: 'Foot Locker UK', url: 'https://www.footlocker.co.uk' },
    { name: 'Nike UK', url: 'https://www.nike.com/gb' },
    { name: 'Adidas UK', url: 'https://www.adidas.co.uk' },
    { name: 'JD Sports', url: 'https://www.jdsports.co.uk' },
    { name: 'Offspring', url: 'https://www.offspring.co.uk' },
    { name: 'Size?', url: 'https://www.size.co.uk' },
    { name: 'StockX', url: 'https://stockx.com' },
  ],
  japan: [
    { name: 'Atmos Japan', url: 'https://www.atmos-tokyo.com' },
    { name: 'Snkrdunk', url: 'https://snkrdunk.com' },
    { name: 'Nike JP', url: 'https://www.nike.com/jp' },
    { name: 'Adidas JP', url: 'https://www.adidas.co.jp' },
    { name: 'Zozotown', url: 'https://zozo.jp' },
    { name: 'Rakuten', url: 'https://search.rakuten.co.jp' },
    { name: 'United Arrows', url: 'https://store.united-arrows.co.jp' },
    { name: 'Mita Sneakers', url: 'https://mita-sneakers.co.jp' },
    { name: 'StockX', url: 'https://stockx.com' },
  ],
  australia: [
    { name: 'Nike AU', url: 'https://www.nike.com/au' },
    { name: 'Adidas AU', url: 'https://www.adidas.com.au' },
    { name: 'Foot Locker AU', url: 'https://www.footlocker.com.au' },
    { name: 'Stylerunner', url: 'https://www.stylerunner.com' },
    { name: 'Culture Kings', url: 'https://www.culturekings.com.au' },
    { name: 'GOAT', url: 'https://www.goat.com' },
    { name: 'StockX', url: 'https://stockx.com' },
    { name: 'Laced', url: 'https://www.laced.com' },
    { name: 'JD Sports AU', url: 'https://www.jdsports.com.au' },
  ],
  germany: [
    { name: 'Snipes', url: 'https://www.snipes.com' },
    { name: 'Solebox', url: 'https://www.solebox.com' },
    { name: 'Asphaltgold', url: 'https://asphaltgold.com' },
    { name: 'KLEKT', url: 'https://www.klekt.com' },
    { name: 'Nike DE', url: 'https://www.nike.com/de' },
    { name: 'Adidas DE', url: 'https://www.adidas.de' },
    { name: 'Foot Locker DE', url: 'https://www.footlocker.de' },
    { name: 'About You', url: 'https://www.aboutyou.de' },
    { name: 'StockX', url: 'https://stockx.com' },
  ],
  canada: [
    { name: 'GOAT', url: 'https://www.goat.com' },
    { name: 'StockX', url: 'https://stockx.com' },
    { name: 'Nike CA', url: 'https://www.nike.com/ca' },
    { name: 'Adidas CA', url: 'https://www.adidas.ca' },
    { name: 'Foot Locker CA', url: 'https://www.footlocker.ca' },
    { name: 'JD Sports CA', url: 'https://www.jdsports.ca' },
    { name: 'Livestock', url: 'https://www.deadstock.ca' },
    { name: 'Haven', url: 'https://www.havenshop.ca' },
    { name: 'Bodega', url: 'https://bdgastore.com' },
  ],
  france: [
    { name: 'Courir', url: 'https://www.courir.com' },
    { name: 'Footdistrict', url: 'https://footdistrict.com' },
    { name: 'KLEKT', url: 'https://www.klekt.com' },
    { name: 'Nike FR', url: 'https://www.nike.com/fr' },
    { name: 'Adidas FR', url: 'https://www.adidas.fr' },
    { name: 'Foot Locker FR', url: 'https://www.footlocker.fr' },
    { name: 'Zalando FR', url: 'https://www.zalando.fr' },
    { name: 'END. Clothing', url: 'https://www.endclothing.com' },
    { name: 'StockX', url: 'https://stockx.com' },
  ],
  india: [
    { name: 'Superkicks', url: 'https://www.superkicks.in' },
    { name: 'VegNonVeg', url: 'https://www.vegnonveg.com' },
    { name: 'Mainstreet Marketplace', url: 'https://www.mainstreetmarketplace.in' },
    { name: 'Crepslocker', url: 'https://crepslocker.com' },
    { name: 'Nike IN', url: 'https://www.nike.com/in' },
    { name: 'Adidas IN', url: 'https://www.adidas.co.in' },
    { name: 'Myntra Sneakers', url: 'https://www.myntra.com/sneakers' },
    { name: 'Flipkart Sneakers', url: 'https://www.flipkart.com/footwear/sports-shoes/sneakers' },
    { name: 'StockX', url: 'https://stockx.com' },
  ],
}

function findRegion(regionInput: string): string {
  const lower = regionInput.toLowerCase()
  for (const key of Object.keys(REGION_SITES)) {
    if (lower.includes(key) || key.includes(lower)) return key
  }
  // Strip non-ASCII (emojis, flags) and try again
  const cleaned = lower.replace(/[^\x00-\x7F]/g, '').trim()
  for (const key of Object.keys(REGION_SITES)) {
    if (cleaned.includes(key.split(' ')[0])) return key
  }
  return 'united states'
}

export async function GET(req: NextRequest) {
  const region = req.nextUrl.searchParams.get('region') || 'singapore'
  const sneaker = req.nextUrl.searchParams.get('sneaker') || ''

  const regionKey = findRegion(region)
  let sites = REGION_SITES[regionKey] || REGION_SITES['united states']

  // Prioritise brand-specific official stores
  const lowerSneaker = sneaker.toLowerCase()
  if (lowerSneaker.includes('nike') || lowerSneaker.includes('jordan') || lowerSneaker.includes('air')) {
    sites = [...sites].sort((a) => (a.name.toLowerCase().includes('nike') ? -1 : 0))
  } else if (lowerSneaker.includes('adidas') || lowerSneaker.includes('yeezy') || lowerSneaker.includes('boost')) {
    sites = [...sites].sort((a) => (a.name.toLowerCase().includes('adidas') ? -1 : 0))
  }

  return Response.json({ sites: sites.slice(0, 9), region: regionKey })
}
