"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { AnimatePresence } from "framer-motion";
import MoneyParticle from "./components/MoneyParticle";
import SportsbookSelector, { type Sportsbook } from "./components/SportsbookSelector";

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

  const [sportsbooks, setSportsbooks] = useState<Sportsbook[]>(DEFAULT_SPORTSBOOKS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(DEFAULT_SPORTSBOOKS.map((s) => s.id))
  );
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const savedSportsbooks = localStorage.getItem(STORAGE_KEY);
    const savedSelections = localStorage.getItem(SELECTION_KEY);
    if (savedSportsbooks) {
      try {
        const parsed = JSON.parse(savedSportsbooks) as Sportsbook[];
        const customBooks = parsed.filter((s) => s.isCustom);
        setSportsbooks([...DEFAULT_SPORTSBOOKS, ...customBooks]);
      } catch { /* use defaults */ }
    }
    if (savedSelections) {
      try {
        const parsed = JSON.parse(savedSelections) as string[];
        setSelectedIds(new Set(parsed));
      } catch { /* use defaults */ }
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(sportsbooks));
  }, [sportsbooks, isHydrated]);

  useEffect(() => {
    if (isHydrated) localStorage.setItem(SELECTION_KEY, JSON.stringify([...selectedIds]));
  }, [selectedIds, isHydrated]);

  const handleToggleSportsbook = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleAddCustomSportsbook = useCallback((name: string, url: string) => {
    const id = `custom-${Date.now()}`;
    setSportsbooks((prev) => [...prev, { id, name, url, isCustom: true }]);
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

  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      const id = `p-${particleIdRef.current++}`;
      const image = MONEY_IMAGES[Math.floor(Math.random() * MONEY_IMAGES.length)];
      const isLeft = Math.random() > 0.5;
      const x = isLeft ? Math.random() * 100 : window.innerWidth - 100 - Math.random() * 100;
      setMoneyParticles((prev) => [...prev, { id, image, x, y: -50 }]);
    }, 600);
    return () => clearInterval(interval);
  }, [isLoading]);

  const removeParticle = (id: string) =>
    setMoneyParticles((prev) => prev.filter((p) => p.id !== id));

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
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sportsbook.url, goal }),
      });

      if (!response.ok || !response.body) throw new Error("Failed to start agent");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === "STREAMING_URL") {
              setStreamUrls((prev) => ({ ...prev, [sportsbook.name]: data.streamingUrl }));
            } else if (data.type === "COMPLETE") {
              setStreamUrls((prev) => {
                const updated = { ...prev };
                delete updated[sportsbook.name];
                return updated;
              });

              const result = data.result;
              if (result?.error) {
                setResults((prev) => ({
                  ...prev,
                  [sportsbook.name]: {
                    success: false,
                    data: { error: result.error, reason: result.reason || "Unknown error" },
                  },
                }));
              } else if (result?.betting_odds) {
                setResults((prev) => ({
                  ...prev,
                  [sportsbook.name]: { success: true, data: result as OddsResult },
                }));
              } else {
                setResults((prev) => ({
                  ...prev,
                  [sportsbook.name]: {
                    success: false,
                    data: { error: "No Data", reason: "Agent completed but returned no odds" },
                  },
                }));
              }
            } else if (data.type === "ERROR") {
              setStreamUrls((prev) => {
                const updated = { ...prev };
                delete updated[sportsbook.name];
                return updated;
              });
              setResults((prev) => ({
                ...prev,
                [sportsbook.name]: {
                  success: false,
                  data: { error: "Agent Error", reason: data.error || "Unknown error" },
                },
              }));
            }
          } catch { /* skip malformed chunks */ }
        }
      }
    } catch (error) {
      setResults((prev) => ({
        ...prev,
        [sportsbook.name]: {
          success: false,
          data: { error: "Network Error", reason: error instanceof Error ? error.message : "Failed to connect" },
        },
      }));
    }
  };

  const handleFindOdds = async () => {
    const selectedSportsbooks = sportsbooks.filter((s) => selectedIds.has(s.id));
    if (!selectedSportsbooks.length) return;

    setIsLoading(true);
    setStreamUrls({});
    setResults({});

    try {
      await Promise.all(selectedSportsbooks.map((sb) => fetchSportsbook(sb)));
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
          <Image src="/bestBetLogoWithText.png" alt="BestBet" width={250} height={250} priority />
          <p className="text-zinc-600">helping you find the best odds for any match online</p>
        </div>

        <div className="flex w-full max-w-2xl flex-col gap-4 sm:flex-row sm:gap-6">
          <select
            value={sport}
            onChange={handleSportChange}
            disabled={isLoading}
            className="h-12 flex-1 rounded-lg border border-zinc-300 bg-white px-4 text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="" disabled>Select Sport</option>
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
            {activeStreams.map(([name, url]) => (
              <div key={name} className="flex flex-col gap-2">
                <span className="text-sm font-medium text-zinc-700">{name}</span>
                <div className="relative w-full overflow-hidden rounded-lg border border-zinc-300" style={{ paddingBottom: "56.25%" }}>
                  <iframe src={url} className="absolute inset-0 h-full w-full" allow="autoplay" />
                </div>
              </div>
            ))}

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
                        {["home_wins", "draw", "away_wins"].map((key, i) => (
                          <div key={key} className="rounded bg-zinc-100 p-2">
                            <div className="text-xs text-zinc-500">{["Home", "Draw", "Away"][i]}</div>
                            <div className="font-bold text-zinc-900">
                              {(result.data as OddsResult).betting_odds[key as keyof OddsResult["betting_odds"]]}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="text-sm font-medium text-red-600">{(result.data as ErrorResult).error}</div>
                      <div className="text-xs text-zinc-500">{(result.data as ErrorResult).reason}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

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
