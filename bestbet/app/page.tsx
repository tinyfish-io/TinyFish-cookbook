"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { AnimatePresence } from "framer-motion";
import MoneyParticle from "./components/MoneyParticle";
import SportsbookSelector, { type Sportsbook } from "./components/SportsbookSelector";
import { runMinoSSE } from "./webagent";

const placeholdersBySport: Record<string, string> = {
  soccer: "Galatasaray vs Atletico Madrid",
};

const MONEY_IMAGES = ["/BBCoin.png", "/BBNote1.png", "/BBNote2.png"];

type MoneyParticleType = {
  id: string;
  image: string;
  x: number;
  y: number;
};

const DEFAULT_SPORTSBOOKS: Sportsbook[] = [
  { id: "draftkings", name: "DraftKings", url: "https://www.draftkings.com/" },
  { id: "fanduel", name: "FanDuel", url: "https://www.fanduel.com/" },
  { id: "betmgm", name: "BetMGM", url: "https://www.nj.betmgm.com" },
  { id: "kalshi", name: "Kalshi", url: "https://kalshi.com/sports/soccer" },
  { id: "bet365", name: "Bet365", url: "https://www.bet365.com/usa" },
  { id: "polymarket", name: "Polymarket", url: "https://polymarket.com/sports/live" },
];

const STORAGE_KEY = "bestbet-sportsbooks";
const SELECTION_KEY = "bestbet-selected";

function getCurrentDate(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return now.toLocaleDateString("en-US", options);
}

type OddsResult = {
  url: string;
  game_date: string;
  game_time: string;
  home_team: string;
  away_team: string;
  betting_odds: {
    home_wins: string;
    draw: string;
    away_wins: string;
  };
};

type ErrorResult = {
  error: string;
  reason: string;
};

type SportsbookResult = {
  success: boolean;
  data: OddsResult | ErrorResult;
};

export default function Home() {
  const [sport, setSport] = useState<string>("");
  const [match, setMatch] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [streamUrls, setStreamUrls] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, SportsbookResult>>({});
  const [moneyParticles, setMoneyParticles] = useState<MoneyParticleType[]>([]);
  const particleIdRef = useRef(0);

  // Sportsbook selection state
  const [sportsbooks, setSportsbooks] = useState<Sportsbook[]>(DEFAULT_SPORTSBOOKS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(DEFAULT_SPORTSBOOKS.map((s) => s.id))
  );
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const savedSportsbooks = localStorage.getItem(STORAGE_KEY);
    const savedSelections = localStorage.getItem(SELECTION_KEY);

    if (savedSportsbooks) {
      try {
        const parsed = JSON.parse(savedSportsbooks) as Sportsbook[];
        // Merge with defaults to ensure new default sportsbooks are included
        const customBooks = parsed.filter((s) => s.isCustom);
        setSportsbooks([...DEFAULT_SPORTSBOOKS, ...customBooks]);
      } catch {
        // Invalid data, use defaults
      }
    }

    if (savedSelections) {
      try {
        const parsed = JSON.parse(savedSelections) as string[];
        setSelectedIds(new Set(parsed));
      } catch {
        // Invalid data, use defaults
      }
    }

    setIsHydrated(true);
  }, []);

  // Save to localStorage when sportsbooks change
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sportsbooks));
    }
  }, [sportsbooks, isHydrated]);

  // Save to localStorage when selections change
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(SELECTION_KEY, JSON.stringify([...selectedIds]));
    }
  }, [selectedIds, isHydrated]);

  const handleToggleSportsbook = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleAddCustomSportsbook = useCallback((name: string, url: string) => {
    const id = `custom-${Date.now()}`;
    const newSportsbook: Sportsbook = { id, name, url, isCustom: true };
    setSportsbooks((prev) => [...prev, newSportsbook]);
    setSelectedIds((prev) => new Set([...prev, id]));
  }, []);

  const handleRemoveCustomSportsbook = useCallback((id: string) => {
    setSportsbooks((prev) => prev.filter((s) => s.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  // Spawn money randomly while loading
  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      const id = `p-${particleIdRef.current++}`;
      const image = MONEY_IMAGES[Math.floor(Math.random() * MONEY_IMAGES.length)];
      const isLeft = Math.random() > 0.5;
      const x = isLeft ? Math.random() * 100 : window.innerWidth - 100 - Math.random() * 100;
      const y = -50;

      setMoneyParticles((prev) => [...prev, { id, image, x, y }]);
    }, 600);

    return () => clearInterval(interval);
  }, [isLoading]);

  const removeParticle = (id: string) => {
    setMoneyParticles((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSportChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSport(e.target.value);
    setMatch("");
  };

  const fetchSportsbook = async (sportsbook: Sportsbook) => {
    const sportName = sport.charAt(0).toUpperCase() + sport.slice(1);
    const goal = `You are extracting current betting market data from this sports betting webpage.

CONTEXT:
- Sport: ${sportName}
- Current Date: ${getCurrentDate()}
- Match: ${match}

Focus only on "Pre-match" or "Upcoming" games. If live games are present, prioritize extracting data for games that have not yet started.

---

STEP 1 - LOCATE BETTING ODDS PAGE (if required):
- If the page does not show betting odds, locate the button or text for "Odds" or "Betting Odds"
- This may be nested within sidebars, menu icons, or navigation bars
- Select the category that matches ${sportName}

STEP 2 - GAME AND BET TYPE INPUT (if required):
- If the page lists multiple sports, select ${sportName}
- Locate the match: "${match}"
- If multiple betting types are available, select Moneyline
- Click select/continue/expand/all games to proceed

STEP 3 - FIND UPCOMING BETTING SLOTS:
- Look at the date/time for upcoming games
- Find games matching "${match}" on ${getCurrentDate()}
- Bet values appear on buttons/links with "+" or "-" symbols (e.g., +280, -105)

STEP 4 - RETURN RESULT:
{
  "url": "url of the webpage",
  "game_date": "Today" or "01/20/2026",
  "game_time": "4:15 PM",
  "home_team": "Home Team Name",
  "away_team": "Away Team Name",
  "betting_odds": {
    "home_wins": "+240",
    "draw": "+270",
    "away_wins": "+105"
  }
}`;

    try {
      const resultJson = await runMinoSSE(sportsbook.url, goal, {
        onStreamingUrl: (url) => {
          setStreamUrls((prev) => ({ ...prev, [sportsbook.name]: url }));
        },
        onComplete: (data) => {
          setStreamUrls((prev) => {
            const updated = { ...prev };
            delete updated[sportsbook.name];
            return updated;
          });

          if (data?.error) {
            setResults((prev) => ({
              ...prev,
              [sportsbook.name]: {
                success: false,
                data: {
                  error: data.error as string,
                  reason: (data.reason as string) || "Unknown error",
                },
              },
            }));
          } else if (data?.betting_odds) {
            setResults((prev) => ({
              ...prev,
              [sportsbook.name]: {
                success: true,
                data: data as unknown as OddsResult,
              },
            }));
          }
        },
      });

      if (!resultJson) {
        setResults((prev) => ({
          ...prev,
          [sportsbook.name]: {
            success: false,
            data: { error: "No Response", reason: "No result returned from API" },
          },
        }));
      }
    } catch (error) {
      console.error(`[${sportsbook.name}] Error:`, error);
      setResults((prev) => ({
        ...prev,
        [sportsbook.name]: {
          success: false,
          data: {
            error: "Network Error",
            reason: "Failed to connect to the API",
          },
        },
      }));
    }
  };

  const handleFindOdds = async () => {
    const selectedSportsbooks = sportsbooks.filter((s) => selectedIds.has(s.id));
    if (selectedSportsbooks.length === 0) {
      return;
    }

    setIsLoading(true);
    setStreamUrls({});
    setResults({});

    try {
      await Promise.all(selectedSportsbooks.map((sportsbook) => fetchSportsbook(sportsbook)));
    } finally {
      setIsLoading(false);
    }
  };

  const activeStreams = Object.entries(streamUrls);
  const completedResults = Object.entries(results);

  return (
    <div
      className="relative flex min-h-screen flex-col items-center font-sans"
      style={{ backgroundColor: "rgb(253, 253, 248)" }}
    >
      {/* Settings button in top-right */}
      <div className="absolute right-4 top-4 z-10">
        <SportsbookSelector
          sportsbooks={sportsbooks}
          selectedIds={selectedIds}
          onToggle={handleToggleSportsbook}
          onAddCustom={handleAddCustomSportsbook}
          onRemoveCustom={handleRemoveCustomSportsbook}
          disabled={isLoading}
        />
      </div>

      <main className="flex w-full max-w-6xl flex-col items-center gap-8 px-6 pt-16">
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/bestBetLogoWithText.png"
            alt="BestBet"
            width={250}
            height={250}
            priority
          />
          <p className="text-zinc-600">
            helping you find the best odds for any match online
          </p>
        </div>

        <div className="flex w-full max-w-2xl flex-col gap-4 sm:flex-row sm:gap-6">
          <select
            value={sport}
            onChange={handleSportChange}
            disabled={isLoading}
            className="h-12 flex-1 rounded-lg border border-zinc-300 bg-white px-4 text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="" disabled>
              Select Sport
            </option>
            <option value="soccer">Soccer</option>
          </select>

          <input
            type="text"
            value={match}
            onChange={(e) => setMatch(e.target.value)}
            placeholder={sport !== "" ? placeholdersBySport[sport] : "Select a sport first"}
            disabled={sport === "" || isLoading}
            className="h-12 flex-1 rounded-lg border border-zinc-300 bg-white px-4 text-zinc-900 placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <button
          onClick={handleFindOdds}
          disabled={isLoading || selectedIds.size === 0}
          className="relative h-10 rounded border-2 border-zinc-900 bg-zinc-800 px-6 text-sm font-bold uppercase tracking-wide text-white shadow-[4px_4px_0_0_#18181b] transition-all duration-75 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#18181b] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Searching..." : "Find Best Odds"}
        </button>

        {(activeStreams.length > 0 || completedResults.length > 0) && (
          <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Active streams */}
            {activeStreams.map(([name, url]) => (
              <div key={name} className="flex flex-col gap-2">
                <span className="text-sm font-medium text-zinc-700">{name}</span>
                <div
                  className="relative w-full overflow-hidden rounded-lg border border-zinc-300"
                  style={{ paddingBottom: "56.25%" }}
                >
                  <iframe
                    src={url}
                    className="absolute inset-0 h-full w-full"
                    allow="autoplay"
                  />
                </div>
              </div>
            ))}

            {/* Completed results */}
            {completedResults.map(([name, result]) => (
              <div key={name} className="flex flex-col gap-2">
                <span className="text-sm font-medium text-zinc-700">{name}</span>
                <div className="rounded-lg border border-zinc-300 bg-white p-4">
                  {result.success ? (
                    <div className="flex flex-col gap-3">
                      <div className="text-xs text-zinc-500">
                        {(result.data as OddsResult).game_date} • {(result.data as OddsResult).game_time}
                      </div>
                      <div className="text-sm font-medium text-zinc-900">
                        {(result.data as OddsResult).home_team} vs {(result.data as OddsResult).away_team}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded bg-zinc-100 p-2">
                          <div className="text-xs text-zinc-500">Home</div>
                          <div className="font-bold text-zinc-900">
                            {(result.data as OddsResult).betting_odds.home_wins}
                          </div>
                        </div>
                        <div className="rounded bg-zinc-100 p-2">
                          <div className="text-xs text-zinc-500">Draw</div>
                          <div className="font-bold text-zinc-900">
                            {(result.data as OddsResult).betting_odds.draw}
                          </div>
                        </div>
                        <div className="rounded bg-zinc-100 p-2">
                          <div className="text-xs text-zinc-500">Away</div>
                          <div className="font-bold text-zinc-900">
                            {(result.data as OddsResult).betting_odds.away_wins}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="text-sm font-medium text-red-600">
                        {(result.data as ErrorResult).error}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {(result.data as ErrorResult).reason}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Money particle overlay */}
      <AnimatePresence>
        {moneyParticles.map((particle) => (
          <MoneyParticle
            key={particle.id}
            id={particle.id}
            image={particle.image}
            x={particle.x}
            y={particle.y}
            onComplete={removeParticle}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
