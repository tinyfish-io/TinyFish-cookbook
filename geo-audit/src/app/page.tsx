"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";

/* ─────────── Verified Statistics with Citations ─────────── */
const STATS = [
  {
    value: "40%",
    description: "of Gen Z prefer AI answers over search",
    source: "Forbes / HubSpot, 2024",
    sourceUrl: "https://www.forbes.com",
  },
  {
    value: "800%",
    description: "year-over-year growth in Perplexity AI queries",
    source: "DemandSage, 2025",
    sourceUrl: "https://www.demandsage.com",
  },
  {
    value: "60%",
    description: "of AI search engine answers contain inaccuracies",
    source: "Columbia / Stanford Research",
    sourceUrl: "https://www.techspot.com",
  },
  {
    value: "25%",
    description: "predicted drop in traditional search by 2026",
    source: "Gartner, 2024",
    sourceUrl: "https://www.gartner.com",
  },
];

const CURRENT_DATE = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

export default function Home() {
  const [url, setUrl] = useState("");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleAudit() {
    if (!url.trim()) return;
    // Navigate to audit page — the audit page handles the actual audit
    router.push(`/audit?url=${encodeURIComponent(url.trim())}`);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[960px] px-6 py-4 sm:px-8">
        {/* ━━━━━ Masthead ━━━━━ */}
        <header className="flex items-center justify-between py-3 text-xs tracking-[0.2em] uppercase">
          <span className="text-muted-foreground font-medium">
            {CURRENT_DATE}
          </span>
          <span
            className="font-semibold tracking-[0.25em]"
            style={{ color: "var(--newspaper-red)" }}
          >
            LLM Visibility Report
          </span>
          <span className="text-muted-foreground font-medium">
            Vol. I · No. 1
          </span>
        </header>

        <hr className="newspaper-rule" />

        {/* ━━━━━ Title Block ━━━━━ */}
        <div className="py-8 sm:py-12 text-center">
          <h1
            className="text-7xl sm:text-8xl md:text-9xl font-black tracking-tight leading-none"
            style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
          >
            GEO
          </h1>
          <div className="flex items-center justify-center gap-4 mt-3">
            <span
              className="hidden sm:block h-[2px] w-16"
              style={{ backgroundColor: "var(--newspaper-accent)" }}
            />
            <p
              className="text-base sm:text-lg italic tracking-wide"
              style={{
                fontFamily: "var(--font-playfair), Georgia, serif",
                color: "var(--muted-foreground)",
              }}
            >
              Generative Engine Optimization
            </p>
            <span
              className="hidden sm:block h-[2px] w-16"
              style={{ backgroundColor: "var(--newspaper-accent)" }}
            />
          </div>
        </div>

        <hr className="newspaper-rule" />
        <hr
          className="newspaper-rule-thin mt-[3px]"
          style={{ borderColor: "var(--newspaper-accent)" }}
        />

        {/* ━━━━━ Hero / CTA ━━━━━ */}
        <section className="py-10 sm:py-14 text-center">
          <h2
            className="text-xl sm:text-2xl md:text-3xl leading-snug max-w-2xl mx-auto"
            style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
          >
            Audit how <strong>ChatGPT</strong>, <strong>Claude</strong>, and{" "}
            <strong className="underline decoration-[var(--newspaper-accent)] decoration-2 underline-offset-4">
              Perplexity
            </strong>{" "}
            understand your website.
          </h2>
          <p className="mt-3 text-sm italic text-muted-foreground max-w-lg mx-auto">
            Not search ranking. Not keywords. Answer-engine comprehension.
          </p>

          {/* URL Input */}
          <div className="mt-8 flex flex-col sm:flex-row items-stretch gap-0 max-w-xl mx-auto">
            <input
              ref={inputRef}
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && url.trim()) handleAudit();
              }}
              placeholder="Enter website URL to audit..."
              className="flex-1 px-5 py-4 text-base border-2 border-foreground/20 bg-card focus:outline-none focus:border-foreground/50 sm:border-r-0 transition-colors"
              style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
            />
            <button
              onClick={handleAudit}
              disabled={!url.trim()}
              className="flex items-center justify-center gap-2 px-7 py-4 bg-foreground text-background font-semibold text-sm tracking-[0.15em] uppercase transition-all hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Search className="h-4 w-4" />
              Audit
            </button>
          </div>

          <p className="mt-4 text-xs text-muted-foreground italic">
            Paste any URL — we&apos;ll analyze how answer engines interpret your
            site.
          </p>
        </section>

        {/* ━━━━━ Trusted By ━━━━━ */}
        <div className="flex items-center justify-center gap-4 py-6">
          <span className="hidden sm:block flex-1 max-w-24 h-px bg-border" />
          <span className="text-[10px] sm:text-xs tracking-[0.3em] uppercase text-muted-foreground font-medium">
            Trusted by forward-thinking teams
          </span>
          <span className="hidden sm:block flex-1 max-w-24 h-px bg-border" />
        </div>

        <hr className="newspaper-rule" />

        {/* ━━━━━ How the Audit Works ━━━━━ */}
        <section className="py-10 sm:py-14">
          <h2
            className="text-3xl sm:text-4xl font-bold leading-tight"
            style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
          >
            How the Audit Works
          </h2>
          <p className="mt-1 text-sm italic text-muted-foreground">
            A three-stage process that mirrors how answer engines actually
            consume your site
          </p>

          <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* I. Browser Rendering */}
            <article className="border-l-2 border-foreground/20 pl-5">
              <h3
                className="text-lg font-bold mb-3"
                style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
              >
                I. Browser Rendering
              </h3>
              <p className="drop-cap text-sm leading-relaxed text-muted-foreground">
                Unlike conventional crawlers that parse static HTML, GEO renders
                your site in a real browser environment. JavaScript-heavy
                frameworks — React, Next.js, Webflow — are executed fully,
                producing the same DOM that an answer engine would consume.
                Dynamic navigation, authenticated flows, and interactive regions
                are all captured.
              </p>
            </article>

            {/* II. LLM-Backed Analysis */}
            <article className="border-l-2 border-foreground/20 pl-5">
              <h3
                className="text-lg font-bold mb-3"
                style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
              >
                II. LLM-Backed Analysis
              </h3>
              <p className="drop-cap text-sm leading-relaxed text-muted-foreground">
                The rendered page is evaluated by a language model that generates
                a self-benchmarking assessment: what questions can be
                confidently answered from the page content, what is only
                partially addressed, and what is entirely missing. The output is
                a structured diagnostic — not a keyword report.
              </p>
            </article>

            {/* III. Scoring & Recommendations */}
            <article className="border-l-2 border-foreground/20 pl-5 md:col-span-2 lg:col-span-1">
              <h3
                className="text-lg font-bold mb-3"
                style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
              >
                III. Scoring &amp; Recommendations
              </h3>
              <p className="drop-cap text-sm leading-relaxed text-muted-foreground">
                Findings are aggregated into a single GEO Score (0–100), broken
                down by audit category. Each finding includes a specific,
                actionable recommendation: what to change, where, and why it
                matters for LLM comprehension. The result is a report ready for
                implementation.
              </p>
            </article>
          </div>
        </section>

        <hr className="newspaper-rule" />

        {/* ━━━━━ Why GEO Matters Now + Stats ━━━━━ */}
        <section className="py-10 sm:py-14">
          <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
            {/* Editorial Column */}
            <div>
              <h2
                className="text-3xl sm:text-4xl font-bold leading-tight"
                style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
              >
                Why GEO Matters Now
              </h2>
              <p className="mt-1 text-sm italic text-muted-foreground">
                The shift from search engines to answer engines is not
                incremental — it is structural
              </p>

              <div className="mt-6 space-y-5 text-[15px] leading-relaxed">
                <p className="drop-cap">
                  A growing share of user discovery now happens through ChatGPT,
                  Claude, Perplexity, and AI assistants embedded in browsers and
                  development environments. These systems do not rank pages.
                  They do not rely on keyword placement. They consume rendered
                  content, infer meaning semantically, and are prone to
                  incorrect or vague answers when source material is ambiguous or
                  poorly structured.
                </p>

                <p style={{ color: "var(--newspaper-accent)" }}>
                  Traditional SEO addresses search ranking. GEO addresses a
                  different problem entirely: whether an answer engine can
                  understand your site accurately, extract confident answers, and
                  cite your content when responding to user queries. The two
                  disciplines are complementary but distinct.
                </p>

                <p className="italic text-muted-foreground">
                  Most websites were not authored with LLM consumption in mind.
                  Hedging language, inconsistent messaging across pages, buried
                  value propositions, and interactive content that hides critical
                  information — these are invisible problems in a search-ranking
                  world but fatal in an answer-engine world.
                </p>
              </div>
            </div>

            {/* Sidebar: By the Numbers */}
            <aside className="lg:border-l-2 lg:border-foreground/10 lg:pl-8">
              <h3
                className="text-xs tracking-[0.3em] uppercase font-bold mb-6"
                style={{ letterSpacing: "0.25em" }}
              >
                By the Numbers
              </h3>

              <div className="space-y-7">
                {STATS.map((stat) => (
                  <div key={stat.value}>
                    <p
                      className="text-4xl sm:text-5xl font-black leading-none"
                      style={{
                        fontFamily: "var(--font-playfair), Georgia, serif",
                      }}
                    >
                      {stat.value}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground leading-snug">
                      {stat.description}
                    </p>
                    <a
                      href={stat.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs italic hover:underline"
                      style={{ color: "var(--newspaper-accent)" }}
                    >
                      {stat.source}
                    </a>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <hr className="newspaper-rule" />

        {/* ━━━━━ Footer ━━━━━ */}
        <footer className="py-8 text-center">
          <Link
            href="/audit"
            className="inline-flex items-center gap-2 px-8 py-3 bg-foreground text-background font-semibold text-sm tracking-[0.15em] uppercase transition-all hover:bg-foreground/90"
          >
            <Search className="h-4 w-4" />
            Start Your Audit
          </Link>
          <p className="mt-6 text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} GEO. Powered by TinyFish.
          </p>
        </footer>
      </div>
    </div>
  );
}
