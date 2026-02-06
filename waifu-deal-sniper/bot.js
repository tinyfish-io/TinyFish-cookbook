// =====================================
// 🎎 WAIFU DEAL SNIPER - PRODUCTION BOT
// =====================================
// "Protect the waifu. Save the laifu. Snipe the deal."
// 
// A hosted Discord bot for anime figure collectors
// Users just DM the bot - no setup required!

require('dotenv').config();

const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, Partials } = require('discord.js');
const { TEMPLATES, SPICY_KEYWORDS, HUSBANDO_KEYWORDS, FIGURE_TYPE_KEYWORDS, GACHA_TEMPLATES, ROAST_TEMPLATES, COPIUM_TEMPLATES } = require('./templates');
const db = require('./database');

// Store last search results per user for gacha/roast
const lastSearchResults = new Map();

// Cleanup old search results every 15 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  const maxAge = 15 * 60 * 1000; // 15 minutes
  for (const [userId, data] of lastSearchResults.entries()) {
    if (now - data.timestamp > maxAge) {
      lastSearchResults.delete(userId);
    }
  }
}, 15 * 60 * 1000);

// =====================================
// ⚙️ CONFIG
// =====================================
const CONFIG = {
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  MINO_API_KEY: process.env.MINO_API_KEY,
  MINO_ENDPOINT: 'https://mino.ai/v1/automation/run-sse',
  WATCH_INTERVAL: 5 * 60 * 1000, // 5 minutes
  RATE_LIMIT_WINDOW: 60000,      // 1 minute
  RATE_LIMIT_MAX: 10,            // 10 searches per minute
  MAX_WATCHES_PER_USER: 20,
};

// =====================================
// 🎲 HELPERS
// =====================================
function pick(arr) {
  if (!arr || arr.length === 0) return '';
  return arr[Math.floor(Math.random() * arr.length)];
}

function fill(template, vars) {
  if (!template) return '';
  let result = template;
  for (const [key, val] of Object.entries(vars)) {
    const safeVal = sanitizeForDisplay(String(val));
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), safeVal);
  }
  return result;
}

// =====================================
// 🔒 SECURITY HELPERS
// =====================================

// Sanitize for Discord display (prevent markdown injection)
function sanitizeForDisplay(str) {
  if (!str) return '';
  return str
    .replace(/`/g, '\\`')
    .replace(/@/g, '＠')      // Full-width @ to prevent mentions
    .replace(/#/g, '＃')      // Full-width # to prevent channel mentions
    .slice(0, 200);
}

// Validate search query
function sanitizeQuery(query) {
  if (!query || typeof query !== 'string') return null;
  let clean = query.trim().replace(/\s+/g, ' ');
  if (clean.length > 100) clean = clean.slice(0, 100);
  if (clean.length < 2) return null;
  return clean;
}

// Validate price
function sanitizePrice(price) {
  if (price === null || price === undefined) return null;
  const num = parseInt(price, 10);
  if (isNaN(num) || num < 0) return null;
  if (num > 10000000) return 10000000;
  return num;
}

// Rate limiting
const rateLimits = new Map();

function checkRateLimit(userId) {
  const now = Date.now();
  const userLimits = rateLimits.get(userId) || { count: 0, resetAt: now + CONFIG.RATE_LIMIT_WINDOW };
  
  if (now > userLimits.resetAt) {
    userLimits.count = 0;
    userLimits.resetAt = now + CONFIG.RATE_LIMIT_WINDOW;
  }
  
  userLimits.count++;
  rateLimits.set(userId, userLimits);
  
  return userLimits.count <= CONFIG.RATE_LIMIT_MAX;
}

// Cleanup old rate limits every 10 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [userId, limits] of rateLimits.entries()) {
    if (now > limits.resetAt + 60000) {
      rateLimits.delete(userId);
    }
  }
}, 10 * 60 * 1000);

// =====================================
// 🎭 PERSONALITY DETECTION
// =====================================
function isSpicy(query) {
  const q = query.toLowerCase();
  return SPICY_KEYWORDS.some(kw => q.includes(kw));
}

function isHusbando(query) {
  const q = query.toLowerCase();
  return HUSBANDO_KEYWORDS.some(kw => q.includes(kw));
}

function getFigureType(query) {
  const q = query.toLowerCase();
  for (const [type, keywords] of Object.entries(FIGURE_TYPE_KEYWORDS)) {
    if (keywords.some(kw => q.includes(kw))) return type;
  }
  return null;
}

function getCharacterReaction(query) {
  const q = query.toLowerCase();
  for (const [char, reactions] of Object.entries(TEMPLATES.characters)) {
    if (q.includes(char)) return pick(reactions);
  }
  return null;
}

function getPriceReaction(price) {
  if (price < 3000) return pick(TEMPLATES.prices.budget);
  if (price < 10000) return pick(TEMPLATES.prices.mid);
  if (price < 25000) return pick(TEMPLATES.prices.expensive);
  return pick(TEMPLATES.prices.whale);
}

function getConditionComment(itemGrade, boxGrade) {
  const item = (itemGrade || '').toUpperCase();
  const box = (boxGrade || '').toUpperCase();
  
  if ((item === 'A' || item === 'A-') && (box === 'B' || box === 'B-' || box === 'C')) {
    return pick(TEMPLATES.condition.mint_box_damaged);
  }
  if (item === 'A' && box === 'A') {
    return pick(TEMPLATES.condition.mint_mint);
  }
  if (item === 'A-' || item === 'B+') {
    return pick(TEMPLATES.condition.good);
  }
  return pick(TEMPLATES.condition.used);
}

function isDeal(item) {
  const itemGrade = (item.item_grade || '').toUpperCase();
  const boxGrade = (item.box_grade || '').toUpperCase();
  return (itemGrade === 'A' || itemGrade === 'A-') && 
         (boxGrade === 'B' || boxGrade === 'B-' || boxGrade === 'C');
}

// =====================================
// 🔍 SMART PARSER - Find items in any response format
// =====================================
function findItemsArray(obj) {
  if (!obj) return null;
  
  // If it's a string, try to parse as JSON
  if (typeof obj === 'string') {
    try {
      obj = JSON.parse(obj.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    } catch (e) {
      return null;
    }
  }
  
  // If it's already an array of objects with url/price, return it
  if (Array.isArray(obj) && obj.length > 0 && typeof obj[0] === 'object' && (obj[0].url || obj[0].price)) {
    return obj;
  }
  
  // Search through all properties for an array of items
  if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      
      // Check if this property is an array of objects with url or price
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
        if (value[0].url || value[0].price || value[0].name || value[0].raw_title) {
          console.log(`Found items in field: "${key}" (${value.length} items)`);
          return value;
        }
      }
      
      // Recursively check nested objects (but not arrays)
      if (typeof value === 'object' && !Array.isArray(value)) {
        const nested = findItemsArray(value);
        if (nested) return nested;
      }
    }
  }
  
  return null;
}

// =====================================
// 🔍 MINO API - Multi-Site Search
// =====================================

// Site configurations
const SITES = {
  amiami: {
    name: 'AmiAmi',
    emoji: '🇯🇵',
    currency: 'JPY',
    searchUrl: (query) => `https://www.amiami.com/eng/search/list/?s_keywords=${encodeURIComponent(query)}&s_st_condition_flg=1`,
    goal: `Scrape pre-owned figure listings from this AmiAmi page.

The title contains condition grades like "(Pre-owned ITEM:A/BOX:B)".

For each product (max 8), extract:
- raw_title: FULL title text including "(Pre-owned ITEM:X/BOX:Y)"
- price: Price in JPY (number only)
- url: Product link
- image: Image URL
- in_stock: true/false
- scale: Figure scale if shown (e.g., "1/4", "1/7", "1/8") or null
- manufacturer: Company name (e.g., "Good Smile Company", "FREEing", "Alter", "Kotobukiya", "SEGA", "Banpresto")
- line: Product line if shown (e.g., "B-Style", "POP UP PARADE", "Nendoroid", "figma", "Prize Figure")
- exclusive: true if exclusive (contains "Exclusive", "Limited", "Event"), false otherwise

Return JSON array.`,
  },
  
  mercari: {
    name: 'Mercari US',
    emoji: '🇺🇸',
    currency: 'USD',
    searchUrl: (query) => `https://www.mercari.com/search/?keyword=${encodeURIComponent(query + ' figure')}&status=sold_out%3Afalse`,
    goal: `Scrape figure listings from this Mercari search page.

For each product (max 8), extract:
- raw_title: Full product title
- price: Price in USD (number only, no $)
- url: Product link
- image: Image URL
- in_stock: true if available, false if sold
- condition: Item condition (e.g., "New", "Like new", "Good")
- seller: Seller name if visible

Return JSON array.`,
  },
  
  solaris: {
    name: 'Solaris Japan',
    emoji: '☀️',
    currency: 'USD',
    searchUrl: (query) => `https://solarisjapan.com/search?q=${encodeURIComponent(query)}&filter.category=Figures`,
    goal: `Scrape figure listings from this Solaris Japan search page.

For each product (max 8), extract:
- raw_title: Full product name
- price: Price in USD (number only, no $)
- url: Product link
- image: Image URL
- in_stock: true if "Add to Cart" visible, false if "Sold Out" or "Notify Me"
- condition: Condition text (e.g., "BRAND NEW", "PRE ORDER", "Pre-owned")
- manufacturer: Company name if visible in title (e.g., "Good Smile Company", "Taito")

Return JSON array.`,
  },
};

// Rarity scoring based on actual figure attributes
function calculateRarity(item) {
  let score = 0;
  const name = (item.raw_title || item.name || '').toLowerCase();
  const manufacturer = (item.manufacturer || '').toLowerCase();
  const line = (item.line || '').toLowerCase();
  const scale = item.scale || '';
  const price = parseInt(item.price) || 0;
  
  // === SCALE SCORING ===
  if (scale.includes('1/4')) score += 30;
  else if (scale.includes('1/6')) score += 20;
  else if (scale.includes('1/7')) score += 15;
  else if (scale.includes('1/8')) score += 10;
  else if (name.includes('1/4')) score += 30;
  else if (name.includes('1/6')) score += 20;
  else if (name.includes('1/7')) score += 15;
  else if (name.includes('1/8')) score += 10;
  
  // === MANUFACTURER SCORING ===
  const premiumMakers = ['alter', 'freeing', 'native', 'orchid seed', 'vertex', 'b\'full', 'binding'];
  const goodMakers = ['good smile', 'kotobukiya', 'max factory', 'megahouse', 'phat', 'aquamarine', 'ques q', 'wing'];
  const budgetMakers = ['sega', 'banpresto', 'taito', 'furyu', 'bandai spirits', 'prize'];
  
  if (premiumMakers.some(m => manufacturer.includes(m) || name.includes(m))) score += 25;
  else if (goodMakers.some(m => manufacturer.includes(m) || name.includes(m))) score += 15;
  else if (budgetMakers.some(m => manufacturer.includes(m) || name.includes(m))) score -= 10;
  
  // === LINE SCORING ===
  if (line.includes('b-style') || name.includes('b-style')) score += 25;
  if (line.includes('native') || name.includes('native')) score += 20;
  if (name.includes('bunny') && (name.includes('1/4') || price > 20000)) score += 20;
  if (line.includes('pop up parade') || name.includes('pop up parade')) score -= 5;
  if (name.includes('prize') || name.includes('game-prize') || name.includes('ichiban kuji')) score -= 15;
  if (line.includes('nendoroid') || name.includes('nendoroid')) score += 5;
  if (line.includes('figma') || name.includes('figma')) score += 10;
  
  // === EXCLUSIVE SCORING ===
  if (item.exclusive || name.includes('exclusive') || name.includes('limited')) score += 15;
  if (name.includes('event') || name.includes('wf ') || name.includes('wonder festival')) score += 20;
  
  // === CONDITION SCORING ===
  const itemGrade = (item.item_grade || '').toUpperCase();
  const boxGrade = (item.box_grade || '').toUpperCase();
  if (itemGrade === 'A' && boxGrade === 'A') score += 10;
  if (itemGrade === 'A' && (boxGrade === 'B' || boxGrade === 'C')) score += 5; // Deal!
  
  // === PRICE SANITY CHECK ===
  if (price > 30000) score += 10;
  else if (price > 20000) score += 5;
  else if (price < 2000) score -= 10;
  
  // Determine rarity tier
  if (score >= 50) return { tier: 'ssr', score, label: '🌈 SSR - LEGENDARY' };
  if (score >= 30) return { tier: 'sr', score, label: '⭐ SR - RARE' };
  if (score >= 10) return { tier: 'r', score, label: '📦 R - COMMON' };
  return { tier: 'salt', score, label: '🧂 N - BUDGET' };
}

// Get rarity details for display
function getRarityDetails(item) {
  const details = [];
  const name = (item.raw_title || item.name || '').toLowerCase();
  
  // Scale
  const scaleMatch = name.match(/1\/[4-8]/);
  if (scaleMatch) details.push(`📏 ${scaleMatch[0]} Scale`);
  
  // Manufacturer
  if (item.manufacturer) details.push(`🏭 ${item.manufacturer}`);
  
  // Line
  if (item.line) details.push(`📦 ${item.line}`);
  
  // Special tags
  if (name.includes('exclusive') || name.includes('limited') || item.exclusive) details.push(`✨ Limited/Exclusive`);
  if (name.includes('b-style') || name.includes('bunny')) details.push(`🐰 Bunny`);
  if (name.includes('native')) details.push(`🔞 Native`);
  if (name.includes('prize') || name.includes('game-prize')) details.push(`🎮 Prize Figure`);
  
  return details;
}

async function searchSite(siteKey, query, maxPrice = null) {
  const site = SITES[siteKey];
  if (!site) return { success: false, error: 'Unknown site' };
  
  const searchUrl = site.searchUrl(query);
  const goal = site.goal + (maxPrice ? `\n\nOnly items under ${maxPrice} JPY.` : '');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);
    
    const response = await fetch(CONFIG.MINO_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': CONFIG.MINO_API_KEY,
      },
      body: JSON.stringify({ url: searchUrl, goal }),
      signal: controller.signal,
    });
    
    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`${site.name} API error:`, response.status);
      return { success: false, error: `API error: ${response.status}` };
    }

    // Parse SSE response
    const text = await response.text();
    const lines = text.split('\n');
    
    console.log(`${site.name} response length:`, text.length, 'bytes');
    
    let foundItems = null;
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const event = JSON.parse(line.slice(6));
          
          if (event.type) {
            console.log(`${site.name} event: ${event.type}`);
          }
          
          if (event.type === 'COMPLETE') {
            console.log(`${site.name} COMPLETE event received`);
            let items = findItemsArray(event);
            if (items && items.length > 0) {
              foundItems = items;
            }
          }
          
          if (event.type === 'ERROR' || event.status === 'FAILED') {
            console.error(`${site.name} error event:`, event.error || event.message);
            return { success: false, error: event.error || event.message };
          }
        } catch (e) {
          // Not valid JSON, skip
        }
      }
    }
    
    if (foundItems && foundItems.length > 0) {
      // Post-process items
      foundItems = foundItems.map(item => {
        // Parse grades from title
        const title = item.raw_title || item.full_title || item.name || '';
        const gradeMatch = title.match(/ITEM:\s*([A-C][+-]?)\s*[\/\s]*BOX:\s*([A-C][+-]?)/i);
        
        if (gradeMatch) {
          item.item_grade = gradeMatch[1].toUpperCase();
          item.box_grade = gradeMatch[2].toUpperCase();
          item.name = title.replace(/^\(Pre-owned\s+ITEM:[A-C][+-]?\s*[\/\s]*BOX:[A-C][+-]?\)\s*/i, '').trim() || item.name;
        } else {
          item.item_grade = item.item_grade || null;
          item.box_grade = item.box_grade || null;
          item.name = item.name || title;
        }
        
        // Calculate rarity
        item.rarity = calculateRarity(item);
        item.rarityDetails = getRarityDetails(item);
        item.site = siteKey;
        item.siteName = site.name;
        item.siteEmoji = site.emoji;
        
        console.log(`  → ${(item.name || 'Unknown').slice(0, 40)}... | ${item.rarity.label}`);
        
        return item;
      });
      
      console.log(`✅ ${site.name} found ${foundItems.length} items`);
      return { success: true, items: foundItems, site: siteKey };
    }
    
    // Fallback
    try {
      const fullJson = JSON.parse(text);
      const items = findItemsArray(fullJson);
      if (items && items.length > 0) {
        const processedItems = items.map(item => {
          item.rarity = calculateRarity(item);
          item.rarityDetails = getRarityDetails(item);
          item.site = siteKey;
          item.siteName = site.name;
          item.siteEmoji = site.emoji;
          return item;
        });
        console.log(`✅ ${site.name} found ${processedItems.length} items (fallback)`);
        return { success: true, items: processedItems, site: siteKey };
      }
    } catch (e) {
      // Not valid JSON
    }
    
    console.log(`${site.name} response tail:`, text.slice(-500));
    console.error(`❌ No items found from ${site.name}`);
    return { success: false, error: 'No results found' };
  } catch (error) {
    console.error(`${site.name} search error:`, error.message);
    return { success: false, error: error.message };
  }
}

// Main search function - defaults to AmiAmi, can specify site
async function searchAmiAmi(query, maxPrice = null, siteKey = 'amiami') {
  return searchSite(siteKey, query, maxPrice);
}

// Search multiple sites at once
async function searchAllSites(query, maxPrice = null) {
  const siteKeys = ['amiami', 'mercari', 'solaris'];
  
  const results = await Promise.allSettled(
    siteKeys.map(site => searchSite(site, query, maxPrice))
  );
  
  const allItems = [];
  const siteResults = {};
  
  results.forEach((result, index) => {
    const siteKey = siteKeys[index];
    if (result.status === 'fulfilled' && result.value.success) {
      siteResults[siteKey] = result.value;
      allItems.push(...result.value.items);
    } else {
      console.log(`${siteKey} failed:`, result.reason?.message || result.value?.error);
    }
  });
  
  // Sort by rarity score
  allItems.sort((a, b) => (b.rarity?.score || 0) - (a.rarity?.score || 0));
  
  return {
    success: allItems.length > 0,
    items: allItems,
    siteResults,
    sitesSearched: siteKeys,
  };
}

// =====================================
// 🎨 DISCORD EMBEDS
// =====================================
function createFigureEmbed(item) {
  const isGoodDeal = isDeal(item);
  const price = parseInt(item.price) || 0;
  const rarity = item.rarity?.tier || 'r';
  const rarityLabel = item.rarity?.label || '';
  
  // Color based on rarity or deal status
  const rarityColors = {
    ssr: 0xFFD700,  // Gold
    sr: 0xA855F7,   // Purple
    r: 0x3B82F6,    // Blue
    salt: 0x6B7280, // Gray
  };
  const embedColor = isGoodDeal ? 0xFF6B6B : (rarityColors[rarity] || 0x6C5CE7);
  
  // Title prefix based on rarity
  const rarityPrefix = rarity === 'ssr' ? '🌈 ' : rarity === 'sr' ? '⭐ ' : '';
  
  const embed = new EmbedBuilder()
    .setColor(embedColor)
    .setTitle(`${isGoodDeal ? '🔥 ' : rarityPrefix}${(item.name || 'Figure').slice(0, 250)}`)
    .setURL(item.url || 'https://www.amiami.com');
  
  // Only set thumbnail if it's a valid URL
  if (item.image && item.image.startsWith('http')) {
    embed.setThumbnail(item.image);
  }
  
  let desc = '';
  if (isGoodDeal) {
    desc += `**${pick(TEMPLATES.deal_alert)}**\n\n`;
  } else if (rarity === 'ssr') {
    desc += `**${rarityLabel}**\n\n`;
  }
  
  desc += `💴 **¥${price.toLocaleString()}**\n`;
  desc += `✨ Figure: **${item.item_grade || '?'}** | 📦 Box: **${item.box_grade || '?'}**\n`;
  desc += `${item.in_stock !== false ? '✅ In Stock' : '❌ Sold Out'}`;
  
  // Add rarity tags if present
  if (item.rarityDetails && item.rarityDetails.length > 0) {
    desc += `\n\n🏷️ ${item.rarityDetails.slice(0, 3).join(' • ')}`;
  }
  
  desc += `\n\n*${getConditionComment(item.item_grade, item.box_grade)}*`;
  
  embed.setDescription(desc);
  
  // Footer with site info if multi-site
  const siteInfo = item.siteEmoji ? `${item.siteEmoji} ${item.siteName} • ` : '';
  embed.setFooter({ text: `${siteInfo}${getPriceReaction(price)} • Click title to buy!` });
  
  return embed;
}

function createResultsSummaryEmbed(items, query, spicy) {
  const deals = items.filter(isDeal);
  const templates = spicy ? TEMPLATES.found.spicy : TEMPLATES.found.normal;
  
  const embed = new EmbedBuilder()
    .setColor(spicy ? 0xE91E63 : 0x6C5CE7)
    .setTitle(`🎯 Results for "${sanitizeForDisplay(query)}"`)
    .setDescription(fill(pick(templates), { count: items.length, query }));
  
  if (deals.length > 0) {
    embed.addFields({
      name: '🔥 Deals Found!',
      value: `${deals.length} item(s) with mint figure + damaged box discount!`
    });
  }
  
  embed.setFooter({ text: `Say "watch ${query}" to get alerts! 🔔` });
  
  return embed;
}

// =====================================
// 🗣️ NATURAL LANGUAGE PARSER
// =====================================
function parseMessage(content) {
  const lower = content.toLowerCase().trim();
  
  // Help
  if (/^(help|commands|how|what can you do)/i.test(lower)) {
    return { intent: 'help' };
  }
  
  // Greetings
  if (/^(hey|hi|hello|yo|sup|henlo|hii+|hewwo|ohayo)(!|\?)?$/i.test(lower)) {
    return { intent: 'greeting' };
  }
  
  // Watchlist
  if (/^(my )?(watchlist|watches|alerts|list|hunting)$/i.test(lower)) {
    return { intent: 'watchlist' };
  }
  
  // Stop watching
  const unwatchMatch = lower.match(/^(stop watching|unwatch|remove|cancel|delete)\s+(.+)/i);
  if (unwatchMatch) {
    return { intent: 'unwatch', query: unwatchMatch[2].trim() };
  }
  
  // === NEW FEATURES ===
  
  // Gacha mode
  const gachaMatch = lower.match(/^(?:gacha|roll|spin|gamble|yolo)\s+(.+)/i);
  if (gachaMatch) {
    return { intent: 'gacha', query: gachaMatch[1].trim() };
  }
  if (/^(?:gacha|roll|spin)$/i.test(lower)) {
    return { intent: 'gacha_last' };
  }
  
  // Roast mode
  if (/^(?:roast|roast me|roast this|judge|judge me|flame)$/i.test(lower)) {
    return { intent: 'roast' };
  }
  const roastMatch = lower.match(/^(?:roast|judge|flame)\s+(.+)/i);
  if (roastMatch) {
    return { intent: 'roast_query', query: roastMatch[1].trim() };
  }
  
  // Copium mode
  if (/^(?:copium|cope|copium mode|inhale|sad|pain)$/i.test(lower)) {
    return { intent: 'copium' };
  }
  
  // === MULTI-SITE SEARCH ===
  
  // Search all sites
  const allSitesMatch = lower.match(/^(?:all|everywhere|all sites)\s+(.+?)(?:\s+under\s+|\s*<\s*)?(\d+)?$/i);
  if (allSitesMatch) {
    const query = allSitesMatch[1].replace(/\s*(figures?|deals?)\s*/gi, ' ').trim();
    const price = allSitesMatch[2] ? parseInt(allSitesMatch[2]) : null;
    if (query.length > 2) {
      return { intent: 'search_all', query, maxPrice: price };
    }
  }
  
  // Site-specific search: mercari <query>, solaris <query>, amiami <query>
  const siteMatch = lower.match(/^(mercari|solaris|amiami)\s+(.+?)(?:\s+under\s+|\s*<\s*)?(\d+)?$/i);
  if (siteMatch) {
    const site = siteMatch[1].toLowerCase();
    const query = siteMatch[2].replace(/\s*(figures?|deals?)\s*/gi, ' ').trim();
    const price = siteMatch[3] ? parseInt(siteMatch[3]) : null;
    if (query.length > 2) {
      return { intent: 'search_site', site, query, maxPrice: price };
    }
  }
  
  // Watch/alert
  const watchPatterns = [
    /^(?:watch|alert|notify|ping|dm|tell)\s+(?:me\s+)?(?:for\s+|when\s+|if\s+)?(.+?)(?:\s+under\s+|\s*<\s*|\s+max\s+)?(\d+)?$/i,
    /^(.+?)\s+(?:alert|notify|watch)(?:\s+under\s+|\s*<\s*)?(\d+)?$/i,
  ];
  for (const pattern of watchPatterns) {
    const match = lower.match(pattern);
    if (match) {
      const query = match[1].replace(/^(for|when|if)\s+/i, '').replace(/\s+(appears?|drops?|available|shows? up).*$/i, '').trim();
      const price = match[2] ? parseInt(match[2]) : null;
      if (query.length > 2) {
        return { intent: 'watch', query, maxPrice: price || 999999 };
      }
    }
  }
  
  // Search patterns - extract query and optional price
  // First, detect if price is in USD (need to convert to JPY for AmiAmi)
  const usdPattern = /[\$](\d+)|(\d+)\s*[\$]|(\d+)\s*(dollars?|bucks?|usd)/i;
  const usdMatch = lower.match(usdPattern);
  const isUSD = !!usdMatch;
  const USD_TO_JPY = 150; // Approximate conversion rate
  
  // Clean the input of conversational fluff
  let cleanedInput = lower
    .replace(/^(yo|hey|hi|hello|sup|bro|dude|man|guys?),?\s*/gi, '')  // Remove greetings
    .replace(/^bro,?\s*/gi, '')  // Remove "bro" again if still there
    .replace(/,?\s*(anything\s+)?(under|below|max|less than)\s*[\$¥]?(\d+)[\$¥]?\s*(works|dollars?|bucks?|usd|jpy|yen)?.*$/i, ' under $3')  // Normalize price
    .trim();
  
  const searchPatterns = [
    // "find me some figure of ganyu from genshin impact under 500"
    /^(?:looking for|find|search|hunt|show|got any|get me|i want|i need)\s+(?:me\s+)?(?:some\s+)?(?:figure[s]?\s+of\s+)?(.+?)(?:\s+under\s+)?(\d+)?$/i,
    // "any ganyu figures under 500"
    /^(?:any\s+)?(.+?)\s+(?:figures?|deals?)(?:\s+under\s+)?(\d+)?$/i,
    // "ganyu under 500"
    /^(.+?)\s+under\s+(\d+)$/i,
  ];
  
  for (const pattern of searchPatterns) {
    const match = cleanedInput.match(pattern);
    if (match) {
      let query = match[1]
        .replace(/\s*(figures?|deals?|please|pls|thx|thanks)\s*/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Extract "X from Y" → "X Y" (e.g., "ganyu from genshin" → "ganyu genshin")
      const fromMatch = query.match(/(.+?)\s+from\s+(.+)/i);
      if (fromMatch) {
        query = fromMatch[1].trim() + ' ' + fromMatch[2].trim();
      }
      
      let price = match[2] ? parseInt(match[2]) : null;
      
      // Convert USD to JPY if detected
      if (price && isUSD) {
        price = Math.round(price * USD_TO_JPY);
      }
      
      if (query.length > 2) {
        return { intent: 'search', query, maxPrice: price, isUSD };
      }
    }
  }
  
  // Stats
  if (/^(stats|statistics|my stats|status)$/i.test(lower)) {
    return { intent: 'stats' };
  }
  
  // Default: treat short text as search
  if (lower.length > 3 && lower.length < 50 && !lower.includes('?')) {
    return { intent: 'search', query: lower };
  }
  
  return { intent: 'unknown' };
}

// =====================================
// 🤖 MESSAGE HANDLERS
// =====================================
async function handleMessage(message, content) {
  const username = message.author.username;
  const discordId = message.author.id;
  
  console.log(`   → handleMessage called with: "${content}"`);
  
  // Get or create user
  const user = db.getOrCreateUser(discordId, username);
  console.log(`   → User: ${user ? 'found/created' : 'NULL'}`);
  
  db.updateUserActivity(discordId);
  
  const isNew = db.isNewUser(discordId);
  const parsed = parseMessage(content);
  
  console.log(`   → Parsed intent: ${parsed.intent}, query: ${parsed.query || 'none'}`);
  
  try {
    switch (parsed.intent) {
      case 'help':
        await message.reply(TEMPLATES.help[0]);
        break;
        
      case 'greeting':
        if (isNew) {
          await message.reply(fill(TEMPLATES.welcome[0], { user: username }));
        } else {
          await message.reply(fill(pick(TEMPLATES.greetings.returning), { user: username }));
        }
        break;
        
      case 'search':
        await handleSearch(message, user, parsed.query, parsed.maxPrice, parsed.isUSD);
        break;
        
      case 'watch':
        await handleWatch(message, user, parsed.query, parsed.maxPrice);
        break;
        
      case 'watchlist':
        await handleWatchlist(message, user);
        break;
        
      case 'unwatch':
        await handleUnwatch(message, user, parsed.query);
        break;
        
      case 'stats':
        await handleStats(message, user);
        break;
      
      // === NEW FEATURES ===
      case 'gacha':
        await handleGacha(message, user, parsed.query);
        break;
        
      case 'gacha_last':
        await handleGachaLast(message, user);
        break;
        
      case 'roast':
        await handleRoast(message, user);
        break;
        
      case 'roast_query':
        await handleRoastQuery(message, user, parsed.query);
        break;
        
      case 'copium':
        await handleCopium(message, user);
        break;
      
      // === MULTI-SITE SEARCH ===
      case 'search_site':
        await handleSearchSite(message, user, parsed.site, parsed.query, parsed.maxPrice);
        break;
        
      case 'search_all':
        await handleSearchAll(message, user, parsed.query, parsed.maxPrice);
        break;
        
      default:
        if (!message.guild) { // DM
          const response = isNew 
            ? fill(TEMPLATES.welcome[0], { user: username })
            : `🤔 Not sure what you mean! Try:\n• \`looking for rem figures\`\n• \`watch marin under 15000\`\n• \`help\``;
          await message.reply(response);
        }
    }
  } catch (error) {
    console.error('Handler error:', error);
    await message.reply(pick(TEMPLATES.errors.search_failed)).catch(() => {});
  }
}

async function handleSearch(message, user, query, maxPrice, isUSD = false) {
  // Validate inputs
  const cleanQuery = sanitizeQuery(query);
  if (!cleanQuery) {
    await message.reply("🤔 That search doesn't look right. Try: `looking for rem figures`");
    return;
  }
  
  const cleanPrice = sanitizePrice(maxPrice);
  
  // Rate limit check
  if (!checkRateLimit(user.discord_id)) {
    await message.reply("⏳ Slow down! Too many searches. Try again in a minute~");
    return;
  }
  
  const spicy = isSpicy(cleanQuery);
  const husbando = isHusbando(cleanQuery);
  const figureType = getFigureType(cleanQuery);
  const charReaction = getCharacterReaction(cleanQuery);
  
  // Build response
  let searchMsg = '';
  
  // Show USD conversion notice
  if (isUSD && cleanPrice) {
    const originalUSD = Math.round(cleanPrice / 150);
    searchMsg += `💱 *$${originalUSD} USD → ¥${cleanPrice.toLocaleString()} JPY*\n\n`;
  }
  
  if (charReaction) {
    searchMsg += charReaction + '\n\n';
  } else if (figureType && TEMPLATES.figure_types[figureType]) {
    searchMsg += pick(TEMPLATES.figure_types[figureType]) + '\n\n';
  }
  
  const templates = husbando ? TEMPLATES.searching.husbando :
                    spicy ? TEMPLATES.searching.spicy :
                    TEMPLATES.searching.normal;
  searchMsg += fill(pick(templates), { query: cleanQuery });
  
  const statusMsg = await message.reply(searchMsg);
  
  // Search!
  const result = await searchAmiAmi(cleanQuery, cleanPrice);
  db.incrementSearchCount(user.id);
  
  if (!result.success) {
    await statusMsg.edit(searchMsg + '\n\n' + pick(TEMPLATES.errors.search_failed));
    return;
  }
  
  if (!result.items || result.items.length === 0) {
    const noResult = fill(
      pick(spicy ? TEMPLATES.no_results.spicy : TEMPLATES.no_results.normal),
      { query: cleanQuery }
    );
    await statusMsg.edit(searchMsg + '\n\n' + noResult);
    return;
  }
  
  // Log & count deals
  db.logSearch(user.id, cleanQuery, result.items.length);
  const deals = result.items.filter(isDeal);
  if (deals.length > 0) {
    db.incrementDealsFound(user.id, deals.length);
  }
  
  // Send results
  const summaryEmbed = createResultsSummaryEmbed(result.items, cleanQuery, spicy);
  await statusMsg.edit({ content: searchMsg, embeds: [summaryEmbed] });
  
  const toShow = result.items.slice(0, 5);
  for (const item of toShow) {
    await message.channel.send({ embeds: [createFigureEmbed(item)] });
  }
  
  if (result.items.length > 5) {
    await message.channel.send(`*...and ${result.items.length - 5} more! Say \`watch ${sanitizeForDisplay(cleanQuery)}\` to get alerts~*`);
  }
}

// =====================================
// 🌐 MULTI-SITE SEARCH HANDLERS
// =====================================
async function handleSearchSite(message, user, siteKey, query, maxPrice) {
  const site = SITES[siteKey];
  if (!site) {
    await message.reply(`🤔 Unknown site! Try: \`mercari rem\`, \`solaris miku\`, or \`amiami power\``);
    return;
  }
  
  const cleanQuery = sanitizeQuery(query);
  if (!cleanQuery) {
    await message.reply(`🤔 What should I search on ${site.name}? Try: \`${siteKey} rem figures\``);
    return;
  }
  
  const cleanPrice = sanitizePrice(maxPrice);
  
  // Rate limit
  if (!checkRateLimit(user.discord_id)) {
    await message.reply("⏳ Slow down! Too many searches. Try again in a minute~");
    return;
  }
  
  // Send searching message
  const searchMsg = `${site.emoji} Searching **${site.name}** for **${sanitizeForDisplay(cleanQuery)}**...`;
  const statusMsg = await message.reply(searchMsg);
  
  // Search
  const result = await searchSite(siteKey, cleanQuery, cleanPrice);
  db.incrementSearchCount(user.id);
  
  if (!result.success) {
    await statusMsg.edit(searchMsg + `\n\n💀 ${site.name} search failed... Try again?`);
    return;
  }
  
  if (!result.items || result.items.length === 0) {
    await statusMsg.edit(searchMsg + `\n\n😢 No results on ${site.name}! Try a different search.`);
    return;
  }
  
  // Store for gacha/roast
  lastSearchResults.set(user.discord_id, { query: cleanQuery, items: result.items, timestamp: Date.now() });
  
  // Log
  db.logSearch(user.id, `${siteKey}:${cleanQuery}`, result.items.length);
  
  // Build summary
  const currency = site.currency === 'USD' ? '$' : '¥';
  const avgPrice = result.items.reduce((sum, i) => sum + (parseInt(i.price) || 0), 0) / result.items.length;
  
  const summaryEmbed = new EmbedBuilder()
    .setColor(siteKey === 'mercari' ? 0xE53935 : siteKey === 'solaris' ? 0xFFA726 : 0x6C5CE7)
    .setTitle(`${site.emoji} ${site.name} Results`)
    .setDescription(`Found **${result.items.length}** results for **${sanitizeForDisplay(cleanQuery)}**\n\nAverage price: **${currency}${Math.round(avgPrice).toLocaleString()}**`);
  
  await statusMsg.edit({ content: null, embeds: [summaryEmbed] });
  
  // Show items
  const toShow = result.items.slice(0, 5);
  for (const item of toShow) {
    const embed = createSiteEmbed(item, site);
    await message.channel.send({ embeds: [embed] });
  }
  
  if (result.items.length > 5) {
    await message.channel.send(`*...and ${result.items.length - 5} more on ${site.name}!*`);
  }
}

async function handleSearchAll(message, user, query, maxPrice) {
  const cleanQuery = sanitizeQuery(query);
  if (!cleanQuery) {
    await message.reply("🤔 What should I search? Try: `all rem figures`");
    return;
  }
  
  const cleanPrice = sanitizePrice(maxPrice);
  
  // Rate limit
  if (!checkRateLimit(user.discord_id)) {
    await message.reply("⏳ Slow down! Too many searches. Try again in a minute~");
    return;
  }
  
  // Send searching message
  const siteList = Object.values(SITES).map(s => s.emoji).join(' ');
  const searchMsg = `🌐 Searching **ALL SITES** for **${sanitizeForDisplay(cleanQuery)}**...\n${siteList}`;
  const statusMsg = await message.reply(searchMsg);
  
  // Search all sites in parallel
  const result = await searchAllSites(cleanQuery, cleanPrice);
  db.incrementSearchCount(user.id);
  
  if (!result.success || !result.items || result.items.length === 0) {
    await statusMsg.edit(searchMsg + `\n\n😢 No results found on any site!`);
    return;
  }
  
  // Store for gacha/roast
  lastSearchResults.set(user.discord_id, { query: cleanQuery, items: result.items, timestamp: Date.now() });
  
  // Log
  db.logSearch(user.id, `all:${cleanQuery}`, result.items.length);
  
  // Count by site
  const siteCounts = {};
  result.items.forEach(item => {
    siteCounts[item.site] = (siteCounts[item.site] || 0) + 1;
  });
  
  // Build summary
  let siteBreakdown = Object.entries(siteCounts)
    .map(([site, count]) => `${SITES[site]?.emoji || '📦'} ${SITES[site]?.name || site}: ${count}`)
    .join('\n');
  
  const summaryEmbed = new EmbedBuilder()
    .setColor(0x9B59B6)
    .setTitle(`🌐 Multi-Site Results`)
    .setDescription(`Found **${result.items.length}** total results for **${sanitizeForDisplay(cleanQuery)}**\n\n${siteBreakdown}`)
    .setFooter({ text: 'Sorted by rarity score' });
  
  await statusMsg.edit({ content: null, embeds: [summaryEmbed] });
  
  // Show top items (mixed from all sites)
  const toShow = result.items.slice(0, 6);
  for (const item of toShow) {
    const site = SITES[item.site] || { emoji: '📦', name: 'Unknown', currency: 'JPY' };
    const embed = createSiteEmbed(item, site);
    await message.channel.send({ embeds: [embed] });
  }
  
  if (result.items.length > 6) {
    await message.channel.send(`*...and ${result.items.length - 6} more across all sites!*`);
  }
}

// Create embed for site-specific results
function createSiteEmbed(item, site) {
  const price = parseInt(item.price) || 0;
  const currency = site.currency === 'USD' ? '$' : '¥';
  const rarity = item.rarity?.tier || 'r';
  
  const rarityColors = {
    ssr: 0xFFD700,
    sr: 0xA855F7,
    r: 0x3B82F6,
    salt: 0x6B7280,
  };
  
  const embed = new EmbedBuilder()
    .setColor(rarityColors[rarity] || 0x6C5CE7)
    .setTitle(`${(item.name || item.raw_title || 'Figure').slice(0, 250)}`)
    .setURL(item.url || site.searchUrl(''));
  
  // Only set thumbnail if it's a valid URL
  if (item.image && item.image.startsWith('http')) {
    embed.setThumbnail(item.image);
  }
  
  let desc = `${site.emoji} **${site.name}**\n\n`;
  desc += `💰 **${currency}${price.toLocaleString()}**\n`;
  
  // Condition (varies by site)
  if (item.item_grade && item.box_grade) {
    desc += `✨ Figure: **${item.item_grade}** | 📦 Box: **${item.box_grade}**\n`;
  } else if (item.condition) {
    desc += `✨ Condition: **${item.condition}**\n`;
  }
  
  // Seller (Mercari)
  if (item.seller) {
    desc += `👤 Seller: ${item.seller}\n`;
  }
  
  // Manufacturer
  if (item.manufacturer) {
    desc += `🏭 ${item.manufacturer}\n`;
  }
  
  desc += `${item.in_stock !== false ? '✅ Available' : '❌ Sold Out'}`;
  
  embed.setDescription(desc);
  embed.setFooter({ text: `${site.emoji} ${site.name} • Click title to buy!` });
  
  return embed;
}

async function handleWatch(message, user, query, maxPrice) {
  const cleanQuery = sanitizeQuery(query);
  if (!cleanQuery) {
    await message.reply("🤔 That doesn't look right. Try: `watch rem under 10000`");
    return;
  }
  
  const cleanPrice = sanitizePrice(maxPrice) || 999999;
  
  // Check limit
  const currentWatches = db.getUserWatchlist(user.id);
  if (currentWatches.length >= CONFIG.MAX_WATCHES_PER_USER) {
    await message.reply(`😅 You have ${CONFIG.MAX_WATCHES_PER_USER} watches! Remove some with \`stop watching <figure>\` first.`);
    return;
  }
  
  const result = db.addToWatchlist(user.id, cleanQuery, cleanPrice);
  const template = result.new ? pick(TEMPLATES.watch.added) : pick(TEMPLATES.watch.already_watching);
  await message.reply(fill(template, { query: cleanQuery, price: cleanPrice.toLocaleString() }));
}

async function handleWatchlist(message, user) {
  const watches = db.getUserWatchlist(user.id);
  
  if (watches.length === 0) {
    await message.reply(pick(TEMPLATES.watch.list_empty));
    return;
  }
  
  let response = pick(TEMPLATES.watch.list_header) + '\n\n';
  watches.forEach((w, i) => {
    const price = w.max_price < 999999 ? `under ¥${w.max_price.toLocaleString()}` : 'any price';
    response += `${i + 1}. **${sanitizeForDisplay(w.query)}** — ${price}\n`;
  });
  response += `\n*Say \`stop watching <name>\` to remove~*`;
  
  await message.reply(response);
}

async function handleUnwatch(message, user, query) {
  const cleanQuery = sanitizeQuery(query);
  if (!cleanQuery) {
    await message.reply("🤔 What should I stop watching? Say `watchlist` to see your hunts!");
    return;
  }
  
  const removed = db.removeFromWatchlist(user.id, cleanQuery);
  if (removed) {
    await message.reply(fill(pick(TEMPLATES.watch.removed), { query: cleanQuery }));
  } else {
    await message.reply(`🤔 Couldn't find "${sanitizeForDisplay(cleanQuery)}" in your watchlist.`);
  }
}

async function handleStats(message, user) {
  const stats = db.getUserStats(user.discord_id);
  const globalStats = db.getStats();
  
  const embed = new EmbedBuilder()
    .setColor(0x6C5CE7)
    .setTitle('📊 Your Hunting Stats')
    .setDescription(`
🔍 **Searches:** ${stats.total_searches}
🔥 **Deals Found:** ${stats.deals_found}
👀 **Active Watches:** ${stats.active_watches}
📅 **Joined:** ${new Date(stats.created_at).toLocaleDateString()}
    `)
    .setFooter({ text: `🌍 Global: ${globalStats.totalUsers} hunters • ${globalStats.totalSearches} searches` });
  
  await message.reply({ embeds: [embed] });
}

// =====================================
// 🎰 GACHA MODE - Let fate decide!
// =====================================
async function handleGacha(message, user, query) {
  const cleanQuery = sanitizeQuery(query);
  if (!cleanQuery) {
    await message.reply("🎰 Gacha what? Try: `gacha rem` or `gacha miku figures`");
    return;
  }
  
  // Rate limit
  if (!checkRateLimit(user.discord_id)) {
    await message.reply("⏳ Even gacha has rate limits! Try again in a minute~");
    return;
  }
  
  // Show rolling message
  const rollingMsg = await message.reply(pick(GACHA_TEMPLATES.rolling));
  
  // Search for figures
  const result = await searchAmiAmi(cleanQuery);
  db.incrementSearchCount(user.id);
  
  if (!result.success || !result.items || result.items.length === 0) {
    await rollingMsg.edit("🎰 The gacha machine is empty... No figures found! Try a different search.");
    return;
  }
  
  // Store for later gacha
  lastSearchResults.set(user.discord_id, { query: cleanQuery, items: result.items, timestamp: Date.now() });
  
  // Pick random figure
  const chosen = result.items[Math.floor(Math.random() * result.items.length)];
  const price = parseInt(chosen.price) || 0;
  
  // Use calculated rarity from the item (now includes scale, manufacturer, etc.)
  const rarity = chosen.rarity?.tier || 'r';
  const rarityLabel = chosen.rarity?.label || '📦 R - COMMON';
  const rarityScore = chosen.rarity?.score || 0;
  const rarityDetails = chosen.rarityDetails || [];
  
  // Build response
  await new Promise(r => setTimeout(r, 1500)); // Dramatic pause
  
  // Rarity-based colors
  const rarityColors = {
    ssr: 0xFFD700,  // Gold
    sr: 0xA855F7,   // Purple
    r: 0x3B82F6,    // Blue
    salt: 0x6B7280, // Gray
  };
  
  const embed = new EmbedBuilder()
    .setColor(rarityColors[rarity] || 0x6C5CE7)
    .setTitle(`🎰 ${pick(GACHA_TEMPLATES.rarity[rarity])}`)
    .setDescription(`${pick(GACHA_TEMPLATES.reveal)}\n\n**${(chosen.name || 'Mystery Figure').slice(0, 200)}**`)
    .addFields(
      { name: '💴 Price', value: `¥${price.toLocaleString()}`, inline: true },
      { name: '✨ Condition', value: `Item: ${chosen.item_grade || '?'} | Box: ${chosen.box_grade || '?'}`, inline: true },
      { name: '📦 Stock', value: chosen.in_stock !== false ? '✅ Available!' : '❌ Sold Out', inline: true }
    )
    .setURL(chosen.url || 'https://www.amiami.com');
  
  // Add rarity details if any
  if (rarityDetails.length > 0) {
    embed.addFields({ name: '🏷️ Tags', value: rarityDetails.slice(0, 4).join(' • '), inline: false });
  }
  
  embed.setFooter({ text: `${rarityLabel} (Score: ${rarityScore}) • 🎲 Rolled from ${result.items.length} figures` });
  
  if (chosen.image) {
    embed.setThumbnail(chosen.image);
  }
  
  await rollingMsg.edit({ content: null, embeds: [embed] });
}

async function handleGachaLast(message, user) {
  const lastSearch = lastSearchResults.get(user.discord_id);
  
  if (!lastSearch || Date.now() - lastSearch.timestamp > 10 * 60 * 1000) {
    await message.reply("🎰 No recent search to gacha from! Try: `gacha rem` or search something first.");
    return;
  }
  
  if (!lastSearch.items || lastSearch.items.length === 0) {
    await message.reply("🎰 No figures in the last search! Try: `gacha rem`");
    return;
  }
  
  // Reuse the stored results
  const chosen = lastSearch.items[Math.floor(Math.random() * lastSearch.items.length)];
  const price = parseInt(chosen.price) || 0;
  
  // Use calculated rarity
  const rarity = chosen.rarity?.tier || 'r';
  const rarityLabel = chosen.rarity?.label || '📦 R - COMMON';
  const rarityScore = chosen.rarity?.score || 0;
  const rarityDetails = chosen.rarityDetails || [];
  
  // Rarity-based colors
  const rarityColors = {
    ssr: 0xFFD700,  // Gold
    sr: 0xA855F7,   // Purple
    r: 0x3B82F6,    // Blue
    salt: 0x6B7280, // Gray
  };
  
  const embed = new EmbedBuilder()
    .setColor(rarityColors[rarity] || 0x6C5CE7)
    .setTitle(`🎰 ${pick(GACHA_TEMPLATES.rarity[rarity])}`)
    .setDescription(`**${(chosen.name || 'Mystery Figure').slice(0, 200)}**\n\n💴 ¥${price.toLocaleString()}`)
    .setURL(chosen.url || 'https://www.amiami.com');
  
  if (rarityDetails.length > 0) {
    embed.addFields({ name: '🏷️ Tags', value: rarityDetails.slice(0, 3).join(' • '), inline: false });
  }
  
  embed.setFooter({ text: `${rarityLabel} (Score: ${rarityScore}) • 🎲 Rerolled from "${lastSearch.query}"` });
  
  if (chosen.image) {
    embed.setThumbnail(chosen.image);
  }
  
  await message.reply({ embeds: [embed] });
}

// =====================================
// 🔥 ROAST MODE - Savage feedback
// =====================================
async function handleRoast(message, user) {
  const lastSearch = lastSearchResults.get(user.discord_id);
  
  if (!lastSearch || Date.now() - lastSearch.timestamp > 10 * 60 * 1000) {
    await message.reply("🔥 Roast what? Search for something first, then say `roast`!");
    return;
  }
  
  await handleRoastQuery(message, user, lastSearch.query, lastSearch.items);
}

async function handleRoastQuery(message, user, query, existingItems = null) {
  const cleanQuery = sanitizeQuery(query);
  if (!cleanQuery) {
    await message.reply("🔥 Can't roast nothing! Try: `roast rem` or search first then say `roast`");
    return;
  }
  
  // Use existing items if provided (from previous search), otherwise roast without price data
  // NO API CALL - roasts are template-based!
  const items = existingItems || [];
  
  // Build the roast
  let roast = '';
  
  // Character-specific roast
  const lowerQuery = cleanQuery.toLowerCase();
  for (const [char, roasts] of Object.entries(ROAST_TEMPLATES.character_specific)) {
    if (lowerQuery.includes(char)) {
      roast += pick(roasts) + '\n\n';
      break;
    }
  }
  
  // General roast
  roast += fill(pick(ROAST_TEMPLATES.general), { query: cleanQuery });
  
  // Add price roast ONLY if we have items from a previous search
  if (items && items.length > 0) {
    const avgPrice = items.reduce((sum, i) => sum + (parseInt(i.price) || 0), 0) / items.length;
    
    if (avgPrice > 15000) {
      const meals = Math.floor(avgPrice / 500);
      roast += '\n\n' + fill(pick(ROAST_TEMPLATES.expensive), { price: Math.round(avgPrice).toLocaleString(), meals });
    } else if (avgPrice < 2000) {
      roast += '\n\n' + fill(pick(ROAST_TEMPLATES.cheap), { price: Math.round(avgPrice).toLocaleString() });
    }
    
    // Sold out roast
    const soldOut = items.filter(i => i.in_stock === false).length;
    if (soldOut > items.length / 2) {
      roast += '\n\n' + pick(ROAST_TEMPLATES.soldout);
    }
  }
  
  const embed = new EmbedBuilder()
    .setColor(0xFF4444)
    .setTitle(`🔥 ROAST TIME 🔥`)
    .setDescription(roast)
    .setFooter({ text: "Don't shoot the messenger~ 💅" });
  
  await message.reply({ embeds: [embed] });
}

// =====================================
// 😭 COPIUM MODE - Maximum cope
// =====================================
async function handleCopium(message, user) {
  const lastSearch = lastSearchResults.get(user.discord_id);
  
  let copiumType = 'no_results';
  let context = '';
  
  if (lastSearch && Date.now() - lastSearch.timestamp < 10 * 60 * 1000) {
    const items = lastSearch.items || [];
    const soldOut = items.filter(i => i.in_stock === false).length;
    const avgPrice = items.length > 0 
      ? items.reduce((sum, i) => sum + (parseInt(i.price) || 0), 0) / items.length 
      : 0;
    
    if (items.length === 0) {
      copiumType = 'no_results';
    } else if (soldOut > items.length / 2) {
      copiumType = 'sold_out';
      context = `\n\n*${soldOut}/${items.length} items sold out*`;
    } else if (avgPrice > 15000) {
      copiumType = 'expensive';
      context = `\n\n*Average price: ¥${Math.round(avgPrice).toLocaleString()}*`;
    } else {
      // Check for damaged boxes (deals)
      const hasDamagedBox = items.some(i => 
        (i.box_grade === 'B' || i.box_grade === 'C' || i.box_grade === 'B-') &&
        (i.item_grade === 'A' || i.item_grade === 'A-')
      );
      if (hasDamagedBox) {
        copiumType = 'damaged_box';
      }
    }
  }
  
  const copiumMessages = COPIUM_TEMPLATES[copiumType] || COPIUM_TEMPLATES.no_results;
  
  // Pick 2-3 random copium messages
  const shuffled = [...copiumMessages].sort(() => Math.random() - 0.5);
  const selectedCopium = shuffled.slice(0, Math.min(3, shuffled.length));
  
  const embed = new EmbedBuilder()
    .setColor(0x9B59B6)
    .setTitle(`💨 COPIUM DISPENSARY 💨`)
    .setDescription(selectedCopium.join('\n\n') + context)
    .setFooter({ text: "Remember: Figures can't leave you... unlike your wallet 💸" });
  
  await message.reply({ embeds: [embed] });
}

// =====================================
// 🔔 BACKGROUND WATCH CHECKER
// =====================================
let watchCheckerRunning = false;

async function runWatchChecker(client) {
  // Prevent overlapping runs
  if (watchCheckerRunning) {
    console.log('🔔 Watch checker already running, skipping...');
    return;
  }
  
  watchCheckerRunning = true;
  console.log('🔔 Running watch checker...');
  
  try {
    const watches = db.getAllActiveWatches();
    console.log(`   Checking ${watches.length} active watches`);
    
    // Limit batch size to prevent long-running loops
    const MAX_BATCH = 50;
    const batch = watches.slice(0, MAX_BATCH);
    
    if (watches.length > MAX_BATCH) {
      console.log(`   ⚠️ Limited to ${MAX_BATCH} watches this cycle`);
    }
    
    for (const watch of batch) {
      try {
        await new Promise(r => setTimeout(r, 2000)); // 2s between checks
        
        const result = await searchAmiAmi(watch.query, watch.max_price);
        db.updateWatchChecked(watch.id);
        
        if (!result.success || !result.items?.length) continue;
        
        const user = db.getOrCreateUser(watch.discord_id);
        const deals = result.items.filter(isDeal);
        
        for (const deal of deals) {
          if (!deal.url || db.hasBeenNotified(user.id, deal.url)) continue;
          
          try {
            const discordUser = await client.users.fetch(watch.discord_id);
            const embed = createFigureEmbed(deal);
            embed.setTitle(`🚨 DEAL: ${(deal.name || watch.query).slice(0, 200)}`);
            
            await discordUser.send({
              content: `🔔 **Found a deal for "${sanitizeForDisplay(watch.query)}"!**`,
              embeds: [embed]
            });
            
            db.markNotified(user.id, deal.url);
            db.incrementWatchNotified(watch.id);
            console.log(`   ✅ Notified ${watch.discord_id}`);
          } catch (e) {
            console.log(`   ❌ Couldn't DM ${watch.discord_id}: ${e.message}`);
          }
        }
      } catch (e) {
        console.error(`   Error on watch ${watch.id}:`, e.message);
      }
    }
    
    console.log('🔔 Watch check complete');
  } finally {
    watchCheckerRunning = false;
  }
}

// =====================================
// 🚀 START BOT
// =====================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
});

client.once('ready', () => {
  console.log('');
  console.log('🎎 ═══════════════════════════════════════');
  console.log('🎎  WAIFU DEAL SNIPER is ONLINE!');
  console.log(`🎎  Logged in as ${client.user.tag}`);
  console.log(`🎎  Serving ${client.guilds.cache.size} servers`);
  console.log('🎎 ═══════════════════════════════════════');
  console.log('');
  
  client.user.setActivity('DM me to hunt figures! 🎎', { type: ActivityType.Custom });
  
  // Start watch checker
  setInterval(() => runWatchChecker(client), CONFIG.WATCH_INTERVAL);
  setTimeout(() => runWatchChecker(client), 30000);
});

client.on('messageCreate', async (message) => {
  try {
    if (message.author.bot) return;
    
    const isDM = !message.guild;
    const isMentioned = message.mentions.has(client.user);
    
    // Debug logging
    console.log(`📨 Message from ${message.author.username}: "${message.content.slice(0, 50)}" (DM: ${isDM})`);
    
    if (isDM || isMentioned) {
      // Remove bot mention from content if present
      const cleanContent = message.content.replace(/<@!?\d+>/g, '').trim();
      console.log(`   → Clean content: "${cleanContent}"`);
      if (cleanContent || isDM) {
        await handleMessage(message, cleanContent || message.content);
        console.log(`   → handleMessage completed`);
      }
    }
  } catch (error) {
    console.error('Message handler error:', error);
    console.error('Stack:', error.stack);
    try {
      await message.reply("😵 Something went wrong! Try again?").catch(() => {});
    } catch (e) {
      // Can't reply, just log
    }
  }
});

client.on('error', console.error);
process.on('unhandledRejection', console.error);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 Shutting down gracefully...');
  client.destroy();
  process.exit(0);
});

if (!CONFIG.DISCORD_TOKEN) {
  console.error('❌ DISCORD_TOKEN not set!');
  process.exit(1);
}

if (!CONFIG.MINO_API_KEY) {
  console.error('❌ MINO_API_KEY not set!');
  process.exit(1);
}

// Initialize database then start bot
db.initDb().then(() => {
  console.log('💾 Database initialized');
  client.login(CONFIG.DISCORD_TOKEN);
}).catch(err => {
  console.error('❌ Database init failed:', err);
  process.exit(1);
});
