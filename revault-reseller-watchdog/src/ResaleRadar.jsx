import { useState, useEffect, useRef, useCallback } from "react";
import { CONFIG, sendDiscordAlert } from "./config";
import { scanItem } from "./tinyfish";

const CATEGORIES = [
  { id: "watches", name: "Watches", icon: "⌚", color: "#c9a84c", examples: "Rolex, Patek, AP, Omega", sources: ["Chrono24", "WatchBox", "Bob's Watches", "eBay"], count: "2.4K items tracked" },
  { id: "bags", name: "Bags", icon: "👜", color: "#c77dba", examples: "Hermès, Chanel, Louis Vuitton", sources: ["Fashionphile", "Google Shopping", "Vestiaire", "Rebag"], count: "1.8K items tracked" },
  { id: "cards", name: "Trading Cards", icon: "🃏", color: "#5b8def", examples: "Pokémon, MTG, Sports Cards", sources: ["TCGPlayer", "eBay", "StockX", "PWCC"], count: "12K items tracked" },
  { id: "sports", name: "Sports & Fan Gear", icon: "🏟️", color: "#e07850", examples: "Jerseys, Memorabilia, Fan Gear, Digital Assets", sources: ["Fanatics", "eBay Sports", "PWCC", "Goldin", "StockX", "SidelineSwap"], count: "9.4K items tracked" },
  { id: "sneakers", name: "Sneakers", icon: "👟", color: "#ff6b6b", examples: "Jordan, Yeezy, Dunk, NB", sources: ["StockX", "GOAT", "eBay", "Alias"], count: "8.2K items tracked" },
];



const WATCHLIST = [];


const statusConfig = {
  watching: { color: "#71717a", bg: "#27272a", label: "WATCHING" },
  alert: { color: "#f59e0b", bg: "#422006", label: "PRICE DROP" },
  target_hit: { color: "#22c55e", bg: "#052e16", label: "TARGET HIT 🎯" },
};

const trendArrow = { down: "↘", up: "↗", stable: "→" };
const trendColor = { down: "#22c55e", up: "#ef4444", stable: "#71717a" };

const SOURCE_URLS = {
  "Chrono24": "https://www.chrono24.com",
  "WatchBox": "https://www.thewatchbox.com",
  "Bob's Watches": "https://www.bobswatches.com",
  "Fashionphile": "https://www.fashionphile.com",
  "Google Shopping": "https://shopping.google.com",
  "Vestiaire": "https://www.vestiairecollective.com",
  "Rebag": "https://www.rebag.com",
  "TCGPlayer": "https://www.tcgplayer.com",
  "eBay": "https://www.ebay.com",
  "StockX": "https://www.stockx.com",
  "PWCC": "https://www.pwccmarketplace.com",
  "GOAT": "https://www.goat.com",
  "Alias": "https://www.alias.com",
  "Fanatics": "https://www.fanatics.com",
  "eBay Sports": "https://www.ebay.com/b/Sports-Memorabilia",
  "Goldin": "https://goldin.co",
  "SidelineSwap": "https://sidelineswap.com",
};

// Short descriptions of what the agent looks for per category
const CATEGORY_WHATS = {
  watches: "Agents extract reference numbers, box & papers status, condition grades, and year of production — the factors that swing watch resale value by 10-40%.",
  bags: "Agents extract material type, hardware color, size, completeness (dustbag/box/receipt), and color — because a Togo GHW Birkin 25 in black can resell for 2x more than a Lambskin PHW 35 in a trendy color.",
  cards: "Agents extract PSA/BGS grade, edition, population count, and last sold comps — because a PSA 10 vs PSA 9 of the same card can mean a 3-10x price difference.",
  sports: "Agents extract authentication type, game-worn vs. replica status, player/event details, and inscriptions — because unauthenticated memorabilia is worthless and game-worn commands 10-50x over retail.",
  sneakers: "Agents extract SKU/style codes, size availability, DS vs. used status, and bid/ask spread — because sizes 9-11 command the highest premiums and any wear drops value 30-60%.",
};

// Fields to extract per category (used by both display and runtime prompts)
const EXTRACT_FIELDS = {
  watches: "name, ref_number, price_usd, condition(unworn/excellent/good/fair), box_and_papers(yes/no), year, url",
  bags: "name, brand, model, material, hardware(GHW/SHW/PHW), size, price_usd, condition, includes(dustbag/box/receipt), color, url",
  cards: "name, set, edition, psa_or_bgs_grade, pop_count, price_usd, url",
  sports: "name, player, team, game_worn(yes/no), auth_type(Fanatics/PSA-DNA/JSA/Beckett), inscriptions, price_usd, condition, url",
  sneakers: "name, sku, colorway, sizes_available, ds_or_used, price_usd, bid_ask_spread, url",
};

// Display prompt — shown in Explore "Behind the Scenes" (verbose, educational)
const generateDisplayPrompt = (categoryId, sourceName) => {
  const cat = CATEGORIES.find(c => c.id === categoryId);
  const url = SOURCE_URLS[sourceName] || `https://www.${sourceName.toLowerCase().replace(/\s/g, "")}.com`;
  const fields = EXTRACT_FIELDS[categoryId];

  return {
    url,
    prompt: `Go to ${url}. Search for "{your_item_name}". Find all listings priced at or below {max_buy_price}. Extract: [${fields}]. Flag listings where price allows {target_margin}%+ resale margin. If none found below target, return 3 lowest-priced as "closest matches."`,
  };
};

// Runtime prompt — actually sent to TinyFish (terse, token-efficient)
const generateRuntimePrompt = (categoryId, sourceName, itemName, maxBuyPrice, targetMargin) => {
  const url = SOURCE_URLS[sourceName] || `https://www.${sourceName.toLowerCase().replace(/\s/g, "")}.com`;
  const fields = EXTRACT_FIELDS[categoryId];

  return {
    url,
    prompt: `Go to ${url} and search for "${itemName}". Find listings priced at or below $${maxBuyPrice}. For each listing extract: [${fields}]. If none below target, return the 3 lowest-priced listings. Return as a JSON array of objects. Each object MUST include "price_usd" as a number and "url" as the full listing URL.`,
  };
};

function formatInterval(minutes) {
  if (minutes >= 10080) return `${minutes / 10080} week${minutes / 10080 > 1 ? "s" : ""}`;
  if (minutes >= 1440) return `${minutes / 1440} day${minutes / 1440 > 1 ? "s" : ""}`;
  if (minutes >= 60) return `${minutes / 60} hr${minutes / 60 > 1 ? "s" : ""}`;
  return `${minutes} min`;
}

export default function Revault() {
  const [view, setView] = useState("home");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [expandedItem, setExpandedItem] = useState(null);
  const [showSuggest, setShowSuggest] = useState(false);
  const [suggestValue, setSuggestValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [watchlist, setWatchlist] = useState(WATCHLIST);
  const [showAddForm, setShowAddForm] = useState(false);
  const [agentStatuses, setAgentStatuses] = useState({});
  const [agentResults, setAgentResults] = useState({});
  const [newItem, setNewItem] = useState({
    name: "", category: "watches", targetMargin: 20, targetBuy: "",
  });
  const [scanIntervalMinutes, setScanIntervalMinutes] = useState(() => {
    const saved = localStorage.getItem("revault_scan_interval");
    return saved ? parseInt(saved) : CONFIG.SCAN_INTERVAL_MINUTES;
  });

  const scanIntervalRef = useRef(null);
  const activeScanIds = useRef(new Set());

  const runScan = useCallback(async (item) => {
    // Prevent duplicate scans for the same item
    if (activeScanIds.current.has(item.id)) {
      console.log(`[Scan] Already scanning "${item.name}", skipping`);
      return;
    }
    activeScanIds.current.add(item.id);

    const cat = CATEGORIES.find(c => c.id === item.category);
    const sources = cat?.sources || ["eBay"];

    setAgentStatuses(prev => {
      const next = { ...prev };
      sources.forEach(s => { next[`${item.id}-${s}`] = "scanning"; });
      return next;
    });

    try {
      const updated = await scanItem(item, sources, generateRuntimePrompt, (src, status) => {
        setAgentStatuses(prev => ({ ...prev, [`${item.id}-${src}`]: status }));
      });

      setWatchlist(prev => prev.map(w => w.id === item.id ? updated : w));
    } catch (err) {
      console.error(`[Scan] ${item.name} failed:`, err);
    } finally {
      activeScanIds.current.delete(item.id);
    }
  }, []);

  // Scan all items on interval
  useEffect(() => {
    if (watchlist.length === 0) return;

    const scanAll = () => {
      watchlist.forEach(item => {
        if (!item.scanning) runScan(item);
      });
    };

    scanIntervalRef.current = setInterval(scanAll, scanIntervalMinutes * 60 * 1000);

    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, [watchlist.length, runScan, scanIntervalMinutes]);

  const handleAddItem = () => {
    if (!newItem.name || !newItem.targetBuy) return;
    const cat = CATEGORIES.find(c => c.id === newItem.category);
    const sources = cat?.sources || ["eBay"];
    const base = Number(newItem.targetBuy);

    const added = {
      id: Date.now(),
      name: newItem.name,
      category: newItem.category,
      targetMargin: Number(newItem.targetMargin),
      currentBest: null,
      marketAvg: null,
      targetBuy: base,
      status: "watching",
      trend: "stable",
      sources: sources.map(s => ({
        name: s,
        price: null,
        condition: "Scanning...",
        url: SOURCE_URLS[s] || "",
        listingUrl: "",
      })),
      lastScanned: null,
    };

    setWatchlist(prev => [added, ...prev]);
    setNewItem({ name: "", category: "watches", targetMargin: 20, targetBuy: "" });
    setShowAddForm(false);

    // Immediately trigger TinyFish scan
    runScan(added);
  };

  return (
    <>
    <style>{`
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }
    `}</style>
    <div style={{
      fontFamily: "'DM Sans', 'Satoshi', 'General Sans', 'Helvetica Neue', sans-serif",
      background: "#faf9f6",
      color: "#1a1a1a",
      minHeight: "100vh",
      maxWidth: 880,
      margin: "0 auto",
      padding: "0 16px 40px",
    }}>
      {/* Header */}
      <div style={{
        padding: "20px 0 16px",
        borderBottom: "1px solid #e8e6e1",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <h1 style={{
            fontSize: 22, fontWeight: 800, margin: 0,
            color: "#0f0f0f", letterSpacing: "-0.5px",
            fontFamily: "'Instrument Serif', 'Playfair Display', Georgia, serif",
          }}>
            Revault
          </h1>
          <div style={{ fontSize: 11, color: "#999", marginTop: 2, letterSpacing: 0.3 }}>
            Track. Compare. Flip. — Powered by TinyFish
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["home", "watchlist"].map(v => (
            <button key={v} onClick={() => { setView(v); setExpandedItem(null); }} style={{
              background: view === v ? "#0f0f0f" : "transparent",
              color: view === v ? "#faf9f6" : "#999",
              border: view === v ? "none" : "1px solid #ddd",
              padding: "6px 14px", borderRadius: 20, fontSize: 11,
              cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
              letterSpacing: 0.3,
            }}>
              {v === "home" ? "Explore" : `Watchlist (${watchlist.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* HOME VIEW */}
      {view === "home" && (
        <>
          {/* Hero */}
          <div style={{ textAlign: "center", padding: "32px 0 24px" }}>
            <h2 style={{
              fontSize: 28, fontWeight: 800, margin: "0 0 6px",
              fontFamily: "'Instrument Serif', Georgia, serif",
              color: "#0f0f0f", letterSpacing: "-0.5px",
            }}>
              What do you want to resell?
            </h2>
            <p style={{ fontSize: 13, color: "#888", margin: 0 }}>
              Pick a category. We'll find the best prices across every platform.
            </p>
          </div>

          {/* Category Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
            marginBottom: 12,
          }}>
            {CATEGORIES.map(cat => (
              <div
                key={cat.id}
                onClick={() => { setSelectedCategory(selectedCategory === cat.id ? null : cat.id); }}
                style={{
                  background: selectedCategory === cat.id ? "#0f0f0f" : "#fff",
                  border: selectedCategory === cat.id ? "none" : "1px solid #e8e6e1",
                  borderRadius: 12,
                  padding: "18px 14px 14px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 6 }}>{cat.icon}</div>
                <div style={{
                  fontSize: 14, fontWeight: 700,
                  color: selectedCategory === cat.id ? "#fff" : "#1a1a1a",
                }}>
                  {cat.name}
                </div>
                <div style={{
                  fontSize: 10,
                  color: selectedCategory === cat.id ? "#999" : "#aaa",
                  marginTop: 2,
                }}>
                  {cat.examples}
                </div>
                <div style={{
                  fontSize: 9, marginTop: 6,
                  color: selectedCategory === cat.id ? cat.color : "#ccc",
                  fontWeight: 600, letterSpacing: 0.5,
                }}>
                  {cat.count}
                </div>
              </div>
            ))}

            {/* + Suggest New Category Tile */}
            {!showSuggest ? (
              <div
                onClick={() => setShowSuggest(true)}
                style={{
                  background: "#fff",
                  border: "2px dashed #ddd",
                  borderRadius: 12,
                  padding: "18px 14px 14px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  textAlign: "center",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 6, color: "#ccc" }}>＋</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#bbb" }}>
                  Suggest
                </div>
                <div style={{ fontSize: 10, color: "#ddd", marginTop: 2 }}>
                  Request a new category
                </div>
              </div>
            ) : !submitted ? (
              <div style={{
                background: "#fff",
                border: "1px solid #e8e6e1",
                borderRadius: 12,
                padding: "14px",
                textAlign: "center",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: 6,
              }}>
                <input
                  value={suggestValue}
                  onChange={e => setSuggestValue(e.target.value)}
                  placeholder="e.g. Vinyl Records"
                  style={{
                    padding: "8px 10px", borderRadius: 8, border: "1px solid #e8e6e1",
                    fontSize: 11, fontFamily: "inherit", width: "100%",
                    outline: "none", boxSizing: "border-box", textAlign: "center",
                    background: "#fafaf8",
                  }}
                />
                <button onClick={() => { if (suggestValue) setSubmitted(true); }} style={{
                  background: "#0f0f0f", color: "#fff", border: "none",
                  padding: "6px 14px", borderRadius: 8, fontSize: 10,
                  cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
                  width: "100%",
                }}>
                  Submit
                </button>
              </div>
            ) : (
              <div style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: 12,
                padding: "18px 14px",
                textAlign: "center",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
              }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>✅</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#166534" }}>
                  "{suggestValue}"
                </div>
                <div style={{ fontSize: 9, color: "#22c55e", marginTop: 2 }}>
                  Submitted!
                </div>
              </div>
            )}
          </div>

          {/* Spacer */}
          <div style={{ marginBottom: 28 }} />

          {/* Behind The Scenes — TinyFish Agent Panel */}
          {selectedCategory && (() => {
            const cat = CATEGORIES.find(c => c.id === selectedCategory);
            const sources = cat?.sources || [];
            const whatLine = CATEGORY_WHATS[selectedCategory];
            return (
              <div style={{
                background: "#fff", border: "1px solid #e8e6e1", borderRadius: 14,
                padding: 20, marginBottom: 24,
              }}>
                {/* Panel Header */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{
                    fontSize: 9, fontWeight: 700, color: "#999", letterSpacing: 2,
                    textTransform: "uppercase", marginBottom: 6,
                  }}>
                    BEHIND THE SCENES
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "#0f0f0f",
                    fontFamily: "'Instrument Serif', Georgia, serif",
                  }}>
                    {cat.icon} How Revault monitors {cat.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 4, lineHeight: 1.5 }}>
                    When you add a {cat.name.toLowerCase().replace(/s$/, "")} to your Watchlist, {sources.length} TinyFish browser agents
                    fan out across reseller platforms every {formatInterval(scanIntervalMinutes)}. Each agent searches for your specific item, filtered
                    to your max buy price, and flags listings that hit your target margin.
                  </div>
                  <div style={{
                    fontSize: 11, color: "#555", marginTop: 10, lineHeight: 1.6,
                    padding: "10px 14px", background: "#f8f7f4", borderRadius: 8,
                    borderLeft: `3px solid ${cat.color}`,
                  }}>
                    {whatLine}
                  </div>
                </div>

                {/* Agent Cards — tied to actual watchlist items */}
                {(() => {
                  const trackedItems = watchlist.filter(w => w.category === selectedCategory);
                  if (trackedItems.length === 0) {
                    return (
                      <>
                        <div style={{
                          fontSize: 10, fontWeight: 700, color: "#999", letterSpacing: 1.5,
                          textTransform: "uppercase", marginBottom: 10,
                        }}>
                          {sources.length} TINYFISH AGENTS — ONE PER PLATFORM
                        </div>
                        <div style={{
                          padding: "24px 16px", borderRadius: 10, border: "2px dashed #e8e6e1",
                          textAlign: "center", marginBottom: 16,
                        }}>
                          <div style={{ fontSize: 13, color: "#999", marginBottom: 4 }}>
                            No {cat.name.toLowerCase()} in your watchlist yet
                          </div>
                          <div style={{ fontSize: 11, color: "#ccc" }}>
                            Add an item below to see the TinyFish prompts that will run for it
                          </div>
                        </div>
                      </>
                    );
                  }
                  return trackedItems.map(item => (
                    <div key={item.id} style={{ marginBottom: 16 }}>
                      <div style={{
                        fontSize: 10, fontWeight: 700, color: "#999", letterSpacing: 1.5,
                        textTransform: "uppercase", marginBottom: 10,
                      }}>
                        TRACKING: {item.name} — {sources.length} AGENTS
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {sources.map((src, idx) => {
                          const runtime = generateRuntimePrompt(selectedCategory, src, item.name, item.targetBuy, item.targetMargin);
                          return (
                            <div key={src} style={{
                              border: "1px solid #e8e6e1",
                              background: "#fafaf8",
                              borderRadius: 10,
                              padding: "14px 16px",
                            }}>
                              <div style={{
                                display: "flex", justifyContent: "space-between", alignItems: "center",
                                marginBottom: 10,
                              }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ fontSize: 16 }}>🐟</span>
                                  <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f0f0f" }}>
                                      Agent #{idx + 1} — {src}
                                    </div>
                                    <div style={{ fontSize: 10, color: "#999" }}>
                                      {runtime.url}
                                    </div>
                                  </div>
                                </div>
                                <div style={{
                                  fontSize: 9, padding: "3px 10px", borderRadius: 10,
                                  background: "#f3f2ef", color: "#999", fontWeight: 700,
                                  letterSpacing: 0.5,
                                }}>
                                  EVERY {formatInterval(scanIntervalMinutes).toUpperCase()}
                                </div>
                              </div>
                              <div style={{
                                background: "#fff",
                                border: "1px solid #e8e6e1",
                                borderRadius: 8,
                                padding: "10px 12px",
                                fontSize: 11,
                                color: "#555",
                                lineHeight: 1.6,
                                fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
                              }}>
                                <div style={{ fontSize: 9, fontWeight: 700, color: "#bbb", letterSpacing: 1, marginBottom: 4 }}>
                                  TINYFISH PROMPT
                                </div>
                                {runtime.prompt}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}

                {/* CTA to Watchlist */}
                <div style={{
                  marginTop: 16, padding: "14px 16px", borderRadius: 10,
                  background: "#f8f0ff", border: "1px solid #e9d5ff",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 10, color: "#a78bfa", marginBottom: 10 }}>
                    Set your target margin + max buy price, and TinyFish watches the web so you don't have to.
                  </div>
                  <button
                    onClick={() => { setView("watchlist"); setShowAddForm(true); setSelectedCategory(null); }}
                    style={{
                      background: "#7c3aed", color: "#fff", border: "none",
                      padding: "8px 24px", borderRadius: 20, fontSize: 11,
                      cursor: "pointer", fontFamily: "inherit", fontWeight: 700,
                      letterSpacing: 0.3,
                    }}
                  >
                    + Add to Watchlist →
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Watchlist summary on Explore page */}
          {watchlist.length > 0 && !selectedCategory && (
            <div style={{
              background: "#fff", border: "1px solid #e8e6e1", borderRadius: 12,
              padding: 16, marginBottom: 24,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                Currently Tracking
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {watchlist.map(item => {
                  const cat = CATEGORIES.find(c => c.id === item.category);
                  const st = statusConfig[item.status];
                  return (
                    <div key={item.id} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "8px 10px", borderRadius: 8, background: "#fafaf8",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span>{cat?.icon}</span>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{item.name}</span>
                        <span style={{
                          fontSize: 9, padding: "2px 6px", borderRadius: 8,
                          background: st.bg, color: st.color, fontWeight: 700,
                        }}>{st.label}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: item.currentBest ? "#1a1a1a" : "#f59e0b" }}>
                        {item.currentBest ? `$${item.currentBest.toLocaleString()}` : "Scanning..."}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Enterprise Section */}
          <div style={{
            background: "#0f0f0f",
            borderRadius: 12,
            padding: "18px 18px",
            marginBottom: 8,
          }}>
            <div style={{
              fontSize: 8, color: "#555", letterSpacing: 1.5,
              textTransform: "uppercase", marginBottom: 4, textAlign: "center",
            }}>
              FOR BRANDS & ENTERPRISES
            </div>
            <h3 style={{
              fontSize: 15, fontWeight: 800, color: "#fff", margin: "0 0 3px",
              fontFamily: "'Instrument Serif', Georgia, serif", textAlign: "center",
            }}>
              Your products are being resold. Do you know for how much?
            </h3>

            {/* Three pillars — side by side */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              <div style={{
                padding: "10px 10px", borderRadius: 8, textAlign: "center",
                background: "#161616", border: "1px solid #222",
              }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>🕵️</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#e4e4e4", lineHeight: 1.3 }}>
                  Competitor Pricing
                </div>
                <div style={{ fontSize: 8, color: "#555", marginTop: 3, lineHeight: 1.3 }}>
                  Track how competitors price items across resale platforms
                </div>
              </div>

              <div style={{
                padding: "10px 10px", borderRadius: 8, textAlign: "center",
                background: "#161616", border: "1px solid #222",
              }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>📊</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#e4e4e4", lineHeight: 1.3 }}>
                  Market Signals
                </div>
                <div style={{ fontSize: 8, color: "#555", marginTop: 3, lineHeight: 1.3 }}>
                  Volume trends, price decay, which SKUs hold value
                </div>
              </div>

              <div style={{
                padding: "10px 10px", borderRadius: 8, textAlign: "center",
                background: "#161616", border: "1px solid #222",
              }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>🏭</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#e4e4e4", lineHeight: 1.3 }}>
                  Scarcity Guidance
                </div>
                <div style={{ fontSize: 8, color: "#555", marginTop: 3, lineHeight: 1.3 }}>
                  Let the secondary market guide your production
                </div>
              </div>
            </div>

            <div style={{
              marginTop: 14, textAlign: "center",
            }}>
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSe38qeT0lMOnbVYaia3C8CJzT9wDYP6EEf5Memzp-b3VzThfQ/viewform?usp=publish-editor"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  background: "#fff", color: "#0f0f0f", border: "none",
                  padding: "8px 22px", borderRadius: 20, fontSize: 10,
                  fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  letterSpacing: 0.3, textDecoration: "none",
                }}
              >
                Request Enterprise Access →
              </a>
              <div style={{ fontSize: 8, color: "#444", marginTop: 6 }}>
                Used by brand protection, merchandising, and strategy teams at luxury houses
              </div>
            </div>
          </div>
        </>
      )}

      {/* WATCHLIST VIEW */}
      {view === "watchlist" && (
        <>
          <div style={{ padding: "20px 0 16px" }}>
            <h2 style={{
              fontSize: 20, fontWeight: 800, margin: "0 0 4px",
              fontFamily: "'Instrument Serif', Georgia, serif",
            }}>
              Your Watchdog List
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <p style={{ fontSize: 12, color: "#999", margin: 0 }}>
                Tracking {watchlist.length} item{watchlist.length !== 1 ? "s" : ""} across {new Set(watchlist.flatMap(w => w.sources.map(s => s.name))).size} platforms.
                {" "}Discord alerts active.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: "#999" }}>Scan every</span>
                <select
                  value={scanIntervalMinutes}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setScanIntervalMinutes(val);
                    localStorage.setItem("revault_scan_interval", val);
                  }}
                  style={{
                    fontSize: 11, color: "#1a1a1a", background: "#fff",
                    border: "1px solid #ddd", borderRadius: 6, padding: "2px 6px",
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  {[
                    { value: 5, label: "5 min" },
                    { value: 10, label: "10 min" },
                    { value: 15, label: "15 min" },
                    { value: 30, label: "30 min" },
                    { value: 60, label: "1 hour" },
                    { value: 360, label: "6 hours" },
                    { value: 720, label: "12 hours" },
                    { value: 1440, label: "1 day" },
                    { value: 2880, label: "2 days" },
                    { value: 4320, label: "3 days" },
                    { value: 10080, label: "7 days" },
                  ].map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>


          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {watchlist.map(item => {
              const st = statusConfig[item.status];
              const isExpanded = expandedItem === item.id;
              const pricedSources = item.sources.filter(s => s.price && s.price > 0);
              const bestSource = pricedSources.length > 0
                ? pricedSources.reduce((a, b) => a.price < b.price ? a : b)
                : item.sources[0] || { name: "N/A", price: 0 };
              const isScanning = !item.currentBest;
              const savings = item.marketAvg && item.currentBest ? item.marketAvg - item.currentBest : 0;
              const savingsPercent = item.marketAvg ? Math.round((savings / item.marketAvg) * 100) : 0;

              return (
                <div
                  key={item.id}
                  onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                  style={{
                    background: "#fff",
                    border: item.status === "target_hit" ? "2px solid #22c55e" : "1px solid #e8e6e1",
                    borderRadius: 12,
                    padding: "14px 16px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {/* Item Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span style={{
                          fontSize: 9, padding: "2px 8px", borderRadius: 10,
                          background: st.bg, color: st.color, fontWeight: 700,
                          letterSpacing: 0.5,
                        }}>
                          {st.label}
                        </span>
                        <span style={{
                          fontSize: 12, color: trendColor[item.trend], fontWeight: 600,
                        }}>
                          {trendArrow[item.trend]}
                        </span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0f0f0f" }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: 10, color: "#bbb", marginTop: 1 }}>
                        Target buy: ${item.targetBuy.toLocaleString()} • Target margin: {item.targetMargin}%
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {isScanning ? (
                        <>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#f59e0b", animation: "pulse 1.5s infinite" }}>
                            Scanning...
                          </div>
                          <div style={{ fontSize: 9, color: "#ccc" }}>TinyFish agents active</div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: 18, fontWeight: 800, color: "#0f0f0f" }}>
                            ${item.currentBest.toLocaleString()}
                          </div>
                          {savingsPercent > 0 && (
                            <div style={{ fontSize: 10, color: "#22c55e", fontWeight: 600 }}>
                              {savingsPercent}% below avg
                            </div>
                          )}
                          {item.marketAvg && (
                            <div style={{ fontSize: 9, color: "#ccc" }}>
                              avg ${item.marketAvg.toLocaleString()}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded */}
                  {isExpanded && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #f0eeea" }}>

                      {/* Agent mini displays while scanning */}
                      {isScanning && (() => {
                        const cat = CATEGORIES.find(c => c.id === item.category);
                        const sources = cat?.sources || [];
                        return (
                          <>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", letterSpacing: 1, marginBottom: 10 }}>
                              TINYFISH AGENTS WORKING
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                              {sources.map((src, idx) => {
                                const status = agentStatuses[`${item.id}-${src}`] || "scanning";
                                const isDone = status === "done" || status === "COMPLETED";
                                const isError = status === "error" || status === "FAILED";
                                const runtime = generateRuntimePrompt(item.category, src, item.name, item.targetBuy, item.targetMargin);
                                return (
                                  <div key={src} onClick={e => e.stopPropagation()} style={{
                                    background: "#0f0f0f",
                                    borderRadius: 8,
                                    padding: "10px 12px",
                                    border: isDone ? "1px solid #22c55e" : isError ? "1px solid #ef4444" : "1px solid #333",
                                  }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                        <span style={{ fontSize: 12 }}>🐟</span>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: "#e4e4e4" }}>
                                          Agent #{idx + 1}
                                        </span>
                                      </div>
                                      <span style={{
                                        fontSize: 8, padding: "2px 6px", borderRadius: 6,
                                        fontWeight: 700, letterSpacing: 0.5,
                                        background: isDone ? "#052e16" : isError ? "#450a0a" : "#422006",
                                        color: isDone ? "#22c55e" : isError ? "#ef4444" : "#f59e0b",
                                        animation: !isDone && !isError ? "pulse 1.5s infinite" : "none",
                                      }}>
                                        {isDone ? "DONE" : isError ? "ERROR" : "RUNNING"}
                                      </span>
                                    </div>
                                    <div style={{ fontSize: 9, color: "#888", fontWeight: 600, marginBottom: 4 }}>
                                      {src}
                                    </div>
                                    <div style={{
                                      fontSize: 8, color: "#555", lineHeight: 1.4,
                                      fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
                                      background: "#161616", borderRadius: 4, padding: "6px 8px",
                                      maxHeight: 40, overflow: "hidden",
                                    }}>
                                      {runtime.prompt}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        );
                      })()}

                      {/* Price Comparison — shown after scan completes */}
                      {!isScanning && (
                        <>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#999", letterSpacing: 1, marginBottom: 8 }}>
                            PRICE COMPARISON
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {item.sources.map((src, i) => {
                              const isBest = src.price && src.price === item.currentBest;
                              const listingUrl = src.listingUrl || src.url;
                              const isClickable = listingUrl && listingUrl.startsWith("http");
                              const Row = isClickable ? "a" : "div";
                              return (
                                <Row
                                  key={i}
                                  {...(isClickable ? { href: listingUrl, target: "_blank", rel: "noopener noreferrer" } : {})}
                                  onClick={e => e.stopPropagation()}
                                  style={{
                                    display: "flex", justifyContent: "space-between", alignItems: "center",
                                    padding: "8px 10px", borderRadius: 8,
                                    background: isBest ? "#f0fdf4" : "#fafaf8",
                                    border: isBest ? "1px solid #bbf7d0" : "1px solid transparent",
                                    textDecoration: "none",
                                    cursor: isClickable ? "pointer" : "default",
                                    transition: "background 0.15s",
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <span style={{
                                      fontSize: 12, fontWeight: isBest ? 700 : 500,
                                      color: isBest ? "#166534" : "#555",
                                    }}>
                                      {src.name}
                                    </span>
                                    {isBest && <span style={{ fontSize: 9, color: "#22c55e", marginLeft: 4 }}>BEST PRICE</span>}
                                    {isClickable && (
                                      <span style={{ fontSize: 9, color: "#5b8def" }}>↗</span>
                                    )}
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <span style={{ fontSize: 10, color: "#999" }}>{src.condition}</span>
                                    <span style={{
                                      fontSize: 13, fontWeight: 700,
                                      color: src.price ? (isBest ? "#166534" : "#1a1a1a") : "#ccc",
                                    }}>
                                      {src.price ? `$${src.price.toLocaleString()}` : "N/A"}
                                    </span>
                                  </div>
                                </Row>
                              );
                            })}
                          </div>
                        </>
                      )}

                      {/* Visual price bar — only show when we have data */}
                      {!isScanning && item.currentBest && item.marketAvg && (
                        <>
                          <div style={{ margin: "14px 0 6px", position: "relative", height: 6, background: "#f0eeea", borderRadius: 3 }}>
                            <div style={{
                              position: "absolute", left: 0, top: 0, height: 6, borderRadius: 3,
                              width: `${Math.min(100, Math.round((item.currentBest / item.marketAvg) * 100))}%`,
                              background: item.currentBest <= item.targetBuy ? "#22c55e" : item.currentBest < item.marketAvg ? "#f59e0b" : "#ef4444",
                            }} />
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#bbb" }}>
                            <span>Target: ${item.targetBuy.toLocaleString()}</span>
                            <span>Best: ${item.currentBest.toLocaleString()}</span>
                            <span>Avg: ${item.marketAvg.toLocaleString()}</span>
                          </div>
                        </>
                      )}

                      {/* Discord alert */}
                      {item.status === "target_hit" && item.currentBest && item.marketAvg && (
                        <div style={{
                          marginTop: 14, padding: 12, borderRadius: 8,
                          background: "#f8f0ff", border: "1px solid #e9d5ff",
                        }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#7c3aed", marginBottom: 4 }}>
                            🔔 DISCORD ALERT SENT
                          </div>
                          <div style={{
                            fontSize: 11, color: "#6b21a8", lineHeight: 1.5,
                            fontFamily: "'JetBrains Mono', monospace",
                          }}>
                            🎯 Target hit! {item.name} at ${item.currentBest.toLocaleString()} on {bestSource.name} ({bestSource.condition}).
                            Market avg: ${item.marketAvg.toLocaleString()}.
                            Potential margin: {Math.round(((item.marketAvg - item.currentBest) / item.currentBest) * 100)}%.
                            Act now — this won't last.
                          </div>
                        </div>
                      )}

                      {!isScanning && (
                        <div style={{
                          marginTop: 10, fontSize: 9, color: "#ccc",
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                        }}>
                          <span>Last scanned: {item.lastScanned ? new Date(item.lastScanned).toLocaleTimeString() : "never"}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); runScan(item); }}
                            style={{
                              background: "#0f0f0f", color: "#fff", border: "none",
                              padding: "4px 12px", borderRadius: 8, fontSize: 9,
                              cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
                            }}
                          >
                            Scan Now
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add to Watchlist CTA */}
          {!showAddForm ? (
            <div
              onClick={() => setShowAddForm(true)}
              style={{
                marginTop: 16, padding: 16, borderRadius: 12,
                background: "#fff", border: "2px dashed #ddd",
                textAlign: "center", cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <div style={{ fontSize: 13, color: "#999" }}>+ Add item to watchdog list</div>
              <div style={{ fontSize: 10, color: "#ccc", marginTop: 4 }}>
                Paste a URL from any supported platform or search by name
              </div>
            </div>
          ) : (
            <div style={{
              marginTop: 16, padding: 20, borderRadius: 12,
              background: "#fff", border: "1px solid #e8e6e1",
            }}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: 16,
              }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Add to Watchdog List</div>
                <button onClick={() => setShowAddForm(false)} style={{
                  background: "none", border: "none", color: "#ccc",
                  fontSize: 18, cursor: "pointer", padding: 0, lineHeight: 1,
                }}>×</button>
              </div>

              {/* Item name */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 10, fontWeight: 600, color: "#999", display: "block", marginBottom: 4, letterSpacing: 0.5 }}>
                  ITEM NAME OR URL
                </label>
                <input
                  value={newItem.name}
                  onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))}
                  placeholder='e.g. "Rolex Submariner 116610" or paste a Chrono24 link'
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 8,
                    border: "1px solid #e8e6e1", fontSize: 13, fontFamily: "inherit",
                    outline: "none", boxSizing: "border-box",
                    background: "#fafaf8",
                  }}
                />
              </div>

              {/* Category */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 10, fontWeight: 600, color: "#999", display: "block", marginBottom: 4, letterSpacing: 0.5 }}>
                  CATEGORY
                </label>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setNewItem(p => ({ ...p, category: cat.id }))}
                      style={{
                        background: newItem.category === cat.id ? "#0f0f0f" : "#fafaf8",
                        color: newItem.category === cat.id ? "#fff" : "#888",
                        border: newItem.category === cat.id ? "none" : "1px solid #e8e6e1",
                        padding: "6px 10px", borderRadius: 8, fontSize: 11,
                        cursor: "pointer", fontFamily: "inherit", fontWeight: 500,
                      }}
                    >
                      {cat.icon} {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target margin + target buy price */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, color: "#999", display: "block", marginBottom: 4, letterSpacing: 0.5 }}>
                    TARGET MARGIN %
                  </label>
                  <input
                    type="number"
                    value={newItem.targetMargin}
                    onChange={e => setNewItem(p => ({ ...p, targetMargin: e.target.value }))}
                    placeholder="20"
                    style={{
                      width: "100%", padding: "10px 12px", borderRadius: 8,
                      border: "1px solid #e8e6e1", fontSize: 13, fontFamily: "inherit",
                      outline: "none", boxSizing: "border-box", background: "#fafaf8",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, color: "#999", display: "block", marginBottom: 4, letterSpacing: 0.5 }}>
                    MAX BUY PRICE ($)
                  </label>
                  <input
                    type="number"
                    value={newItem.targetBuy}
                    onChange={e => setNewItem(p => ({ ...p, targetBuy: e.target.value }))}
                    placeholder="5000"
                    style={{
                      width: "100%", padding: "10px 12px", borderRadius: 8,
                      border: "1px solid #e8e6e1", fontSize: 13, fontFamily: "inherit",
                      outline: "none", boxSizing: "border-box", background: "#fafaf8",
                    }}
                  />
                </div>
              </div>

              {/* Preview */}
              {newItem.name && newItem.targetBuy && (
                <div style={{
                  padding: 12, borderRadius: 8, background: "#f8f9fa",
                  border: "1px solid #e8e6e1", marginBottom: 14,
                  fontSize: 11, color: "#666", lineHeight: 1.5,
                }}>
                  <span style={{ fontWeight: 600, color: "#333" }}>Preview:</span> Watching "{newItem.name}" in {CATEGORIES.find(c => c.id === newItem.category)?.name}.
                  Alert when price drops below ${Number(newItem.targetBuy).toLocaleString()} for {newItem.targetMargin}%+ flip margin.
                  Scanning {CATEGORIES.find(c => c.id === newItem.category)?.sources.join(", ")}.
                </div>
              )}

              {/* Slack notification option */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                marginBottom: 16, padding: "8px 12px", borderRadius: 8,
                background: "#f8f0ff", border: "1px solid #e9d5ff",
              }}>
                <span style={{ fontSize: 14 }}>🔔</span>
                <span style={{ fontSize: 11, color: "#7c3aed" }}>
                  Discord alerts enabled — you'll be notified instantly when target price is hit
                </span>
              </div>

              {/* Submit */}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleAddItem}
                  disabled={!newItem.name || !newItem.targetBuy}
                  style={{
                    flex: 1,
                    background: newItem.name && newItem.targetBuy ? "#0f0f0f" : "#e8e6e1",
                    color: newItem.name && newItem.targetBuy ? "#fff" : "#999",
                    border: "none", padding: "12px 20px", borderRadius: 10,
                    fontSize: 13, fontWeight: 700, cursor: newItem.name && newItem.targetBuy ? "pointer" : "default",
                    fontFamily: "inherit", transition: "all 0.2s",
                  }}
                >
                  🐕 Add to Watchdog List
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  style={{
                    background: "#fafaf8", color: "#999", border: "1px solid #e8e6e1",
                    padding: "12px 16px", borderRadius: 10, fontSize: 12,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <div style={{
        marginTop: 32, paddingTop: 16, borderTop: "1px solid #e8e6e1",
        textAlign: "center", fontSize: 10, color: "#ccc",
      }}>
        Revault • Powered by TinyFish Browser Agents • Built by Laksh Rahoria
      </div>
    </div>
    </>
  );
}
