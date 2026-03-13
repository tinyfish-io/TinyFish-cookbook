"use client";

import { useState, useEffect } from "react";

interface LeaderboardEntry {
  domain: string;
  score: number;
  grade: string;
  gradeColor: string;
  timestamp: string;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((data) => {
        setEntries(data.entries || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen grid-bg">
      <header className="border-b border-gray-800/50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center">
              <span className="text-cyan-400 text-lg">◈</span>
            </div>
            <span className="font-semibold text-white tracking-tight">
              Agent<span className="text-cyan-400">Ready</span>
            </span>
          </a>
          <a href="/" className="text-sm text-gray-400 hover:text-cyan-400 transition-colors">
            ← Run Audit
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">Agent Readiness Leaderboard</h1>
          <p className="text-gray-400 text-sm">
            The most agent-ready e-commerce stores, ranked by AI shopping compatibility.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Loading leaderboard...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20 border border-gray-800 rounded-lg bg-gray-900/30">
            <p className="text-gray-400 text-lg mb-2">No audits yet</p>
            <p className="text-gray-500 text-sm mb-4">
              Run your first audit to appear on the leaderboard.
            </p>
            <a
              href="/"
              className="inline-block px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg transition-colors text-sm"
            >
              Run an Audit
            </a>
          </div>
        ) : (
          <div className="border border-gray-800 rounded-lg overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-gray-800/50 border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500">
              <div className="col-span-1">Rank</div>
              <div className="col-span-6">Store</div>
              <div className="col-span-2 text-right">Score</div>
              <div className="col-span-3 text-right">Status</div>
            </div>

            {/* Entries */}
            <div className="divide-y divide-gray-800/50">
              {entries.map((entry, i) => (
                <div
                  key={entry.domain}
                  className="grid grid-cols-12 gap-4 px-5 py-3.5 items-center hover:bg-white/[0.02] transition-colors"
                >
                  <div className="col-span-1">
                    <span
                      className={`font-mono font-bold text-sm ${
                        i === 0
                          ? "text-yellow-400"
                          : i === 1
                          ? "text-gray-300"
                          : i === 2
                          ? "text-amber-600"
                          : "text-gray-500"
                      }`}
                    >
                      {i + 1}
                    </span>
                  </div>
                  <div className="col-span-6">
                    <a
                      href={`/report/${encodeURIComponent(entry.domain)}`}
                      className="text-white text-sm font-mono hover:text-cyan-400 transition-colors"
                    >
                      {entry.domain}
                    </a>
                  </div>
                  <div className="col-span-2 text-right">
                    <span
                      className="font-mono font-bold text-lg"
                      style={{ color: entry.gradeColor || "#00E5FF" }}
                    >
                      {entry.score}
                    </span>
                  </div>
                  <div className="col-span-3 text-right">
                    <span
                      className="text-xs font-medium px-2 py-1 rounded-full"
                      style={{
                        color: entry.gradeColor || "#666",
                        backgroundColor: `${entry.gradeColor || "#666"}15`,
                      }}
                    >
                      {entry.grade || "Scored"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
