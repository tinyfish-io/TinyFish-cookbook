import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Zap, Shield, Search, Eye, CheckCircle, Lock,
  ArrowRight, Globe, Clock, BarChart3, ChevronRight,
  Gauge, FileText, History, AlertTriangle, Key,
  Database, Code2, Package, Activity, Server, Wifi,
  Brain, Cpu, Layers, GitBranch, Infinity, Radio,
  Sparkles, Bolt, Network, Scan, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

/* Spring green accent */
const SG = "oklch(0.90 0.22 155)";
const SG_DIM = "oklch(0.75 0.20 155)";

const FEATURES = [
  { icon: Zap, label: "Performance", desc: "TTFB, FCP, DOM load time, page weight, compression & resource optimisation", color: "oklch(0.80 0.18 85)", bg: "oklch(0.80 0.18 85 / 0.12)" },
  { icon: Eye, label: "Accessibility", desc: "WCAG 2.1 Level AA — alt text, ARIA roles, colour contrast, keyboard labels", color: SG, bg: "oklch(0.90 0.22 155 / 0.10)" },
  { icon: Search, label: "SEO", desc: "Meta tags, Open Graph, structured data, canonical URLs, robots.txt & sitemap", color: "oklch(0.65 0.18 210)", bg: "oklch(0.65 0.18 210 / 0.12)" },
  { icon: CheckCircle, label: "Best Practices", desc: "HTTPS, mixed content, console errors, safe external links, Content-Type headers", color: "oklch(0.70 0.18 290)", bg: "oklch(0.70 0.18 290 / 0.12)" },
  { icon: Shield, label: "Security (OWASP LLM)", desc: "Full OWASP Top 10 for LLM & GenAI 2025 — LLM01–LLM10: prompt injection, sensitive data, supply chain, unbounded consumption & more", color: SG, bg: "oklch(0.90 0.22 155 / 0.10)" },
  { icon: Lock, label: "Compliance", desc: "GDPR cookie consent, privacy policy, third-party trackers & data collection disclosures", color: "oklch(0.72 0.19 320)", bg: "oklch(0.72 0.19 320 / 0.12)" },
];

const OWASP_LLM_ITEMS = [
  { id: "LLM01", label: "Prompt Injection", desc: "CSP header, inline event handlers, form action security — blocks script-based prompt manipulation", icon: Code2 },
  { id: "LLM02", label: "Sensitive Info Disclosure", desc: "API keys / tokens in HTML, server version headers, debug stack traces, LLM error messages", icon: Key },
  { id: "LLM03", label: "Supply Chain", desc: "Subresource Integrity (SRI) on external scripts, CORS wildcard policy, third-party CDN risk", icon: Package },
  { id: "LLM04", label: "Data & Model Poisoning", desc: "HTTPS enforcement, mixed content detection — prevents MITM data poisoning in transit", icon: Database },
  { id: "LLM05", label: "Improper Output Handling", desc: "X-Content-Type-Options, X-Frame-Options / frame-ancestors, Content-Type charset", icon: Layers },
  { id: "LLM06", label: "Excessive Agency", desc: "Permissions-Policy, COOP, COEP headers, open redirect parameters — limits agent capabilities", icon: Infinity },
  { id: "LLM07", label: "System Prompt Leakage", desc: "AI system prompt patterns in HTML source, hidden input fields with AI instruction names", icon: Brain },
  { id: "LLM08", label: "Vector & Embedding Weaknesses", desc: "HSTS, TLS certificate validity & protocol version, cookie Secure/HttpOnly/SameSite flags", icon: GitBranch },
  { id: "LLM09", label: "Misinformation", desc: "Referrer-Policy, X-XSS-Protection misconfiguration, JavaScript console errors", icon: Radio },
  { id: "LLM10", label: "Unbounded Consumption", desc: "Rate-limiting headers (RateLimit-*, Retry-After), response compression, autocomplete on AI inputs", icon: Activity },
];

const STEPS = [
  { step: "01", title: "Enter your URL", desc: "Paste any public website URL into the input field above." },
  { step: "02", title: "TinyFish AI collects data", desc: "TinyFish web agent navigates your site, extracts headers, cookies, scripts, and security signals in real time." },
  { step: "03", title: "OWASP engine scores it", desc: "Our OWASP LLM 2025 engine scores 90+ checks across 6 categories and delivers actionable results instantly." },
];

const TINYFISH_FEATURES = [
  { icon: Network, title: "Parallel Execution", desc: "Runs 1,000 operations simultaneously — scales from a single audit to enterprise-wide scanning without managing infrastructure." },
  { icon: Brain, title: "AI-Powered Extraction", desc: "Reads page structure, not pixels. Understands dynamic SPAs, lazy-loaded content, and JavaScript-rendered security signals." },
  { icon: Shield, title: "Anti-Bot Protection", desc: "Built-in stealth profiles and residential proxies bypass bot detection, ensuring accurate audits on any site." },
  { icon: Bolt, title: "Real-Time Streaming", desc: "SSE streaming delivers live progress updates as TinyFish navigates — no polling, no waiting for a black box to finish." },
  { icon: Lock, title: "Authenticated Pages", desc: "TinyFish can audit pages behind login, forms, and paywalls — the 93% of the web invisible to traditional scanners." },
  { icon: Cpu, title: "Serverless Architecture", desc: "No browsers to manage, no proxies to configure. TinyFish handles all infrastructure so WebAudit focuses on scoring." },
];

export default function Home() {
  const [url, setUrl] = useState("");
  const [, navigate] = useLocation();

  const startAudit = trpc.audit.start.useMutation({
    onSuccess: (data) => { navigate(`/audit/${data.slug}`); },
    onError: (err) => { toast.error(err.message || "Failed to start audit. Please try again."); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) { toast.error("Please enter a URL to audit."); return; }
    startAudit.mutate({ url: trimmed });
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/85 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.90 0.22 155 / 0.15)", border: "1px solid oklch(0.90 0.22 155 / 0.40)" }}>
              <Gauge className="w-4 h-4" style={{ color: SG }} />
            </div>
            <span className="font-bold text-base tracking-tight">WebAudit</span>
            {/* TinyFish powered-by pill */}
            <a
              href="https://www.tinyfish.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-opacity hover:opacity-80"
              style={{ background: "oklch(0.90 0.22 155 / 0.10)", border: "1px solid oklch(0.90 0.22 155 / 0.25)", color: SG_DIM }}
            >
              🐟 powered by TinyFish
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/history")} className="text-muted-foreground hover:text-foreground gap-1.5">
              <History className="w-4 h-4" /> Recent Audits
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-50 pointer-events-none" />
        <div className="hero-glow absolute inset-0 pointer-events-none" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full blur-[140px] pointer-events-none" style={{ background: "oklch(0.90 0.22 155 / 0.10)" }} />

        <div className="container relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            {/* Dual badge row */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
              <Badge variant="outline" className="px-3 py-1 text-xs gap-1.5" style={{ borderColor: "oklch(0.90 0.22 155 / 0.35)", color: SG, background: "oklch(0.90 0.22 155 / 0.10)" }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ background: SG }} />
                OWASP LLM &amp; GenAI Top 10 2025
              </Badge>
              <a href="https://www.tinyfish.ai" target="_blank" rel="noopener noreferrer">
                <Badge variant="outline" className="px-3 py-1 text-xs gap-1.5 cursor-pointer hover:opacity-80 transition-opacity" style={{ borderColor: "oklch(0.90 0.22 155 / 0.25)", color: SG_DIM, background: "oklch(0.90 0.22 155 / 0.06)" }}>
                  🐟 Data collected by TinyFish AI Agent
                </Badge>
              </a>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] mb-6">
              Audit Any Website<br />
              <span className="gradient-text">In Seconds</span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              <strong style={{ color: SG }}>TinyFish AI</strong> navigates your site and extracts security signals in real time.
              Our <strong style={{ color: SG }}>OWASP LLM &amp; GenAI 2025</strong> engine scores 90+ checks across 6 categories — instantly, no install needed.
            </p>

            {/* URL Input Form */}
            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
              <div className="flex flex-col sm:flex-row gap-3 p-2 rounded-2xl border bg-card/60 backdrop-blur-sm shadow-2xl" style={{ borderColor: "oklch(0.90 0.22 155 / 0.20)" }}>
                <div className="flex-1 flex items-center gap-3 px-4 py-2 rounded-xl bg-background/60">
                  <Globe className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <Input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://yourwebsite.com"
                    className="border-0 bg-transparent p-0 h-auto text-base focus-visible:ring-0 placeholder:text-muted-foreground/50 font-mono"
                    disabled={startAudit.isPending}
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  disabled={startAudit.isPending}
                  className="rounded-xl px-8 font-bold gap-2 transition-all"
                  style={{ background: SG, color: "oklch(0.08 0.005 155)", boxShadow: `0 4px 24px oklch(0.90 0.22 155 / 0.35)` }}
                >
                  {startAudit.isPending ? (
                    <><span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Starting...</>
                  ) : (
                    <>Audit Now <ArrowRight className="w-4 h-4" /></>
                  )}
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground/60">Free to use · No sign-up required · Up to 5 audits/hour · Powered by TinyFish</p>
            </form>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-8 mt-16"
          >
            {[
              { icon: BarChart3, value: "90+", label: "Audit Checks" },
              { icon: Brain, value: "LLM01–LLM10", label: "OWASP GenAI 2025" },
              { icon: FileText, value: "6", label: "Categories" },
              { icon: Sparkles, value: "TinyFish", label: "AI Data Collector" },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex items-center gap-2.5 text-muted-foreground">
                <Icon className="w-4 h-4" style={{ color: "oklch(0.90 0.22 155 / 0.70)" }} />
                <span className="font-bold text-foreground">{value}</span>
                <span className="text-sm">{label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* TinyFish Integration Section */}
      <section className="py-20 border-t border-border/40" style={{ background: "oklch(0.90 0.22 155 / 0.03)" }}>
        <div className="container">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 px-3 py-1 text-xs gap-1.5" style={{ borderColor: "oklch(0.90 0.22 155 / 0.35)", color: SG, background: "oklch(0.90 0.22 155 / 0.10)" }}>
              🐟 Powered by TinyFish
            </Badge>
            <h2 className="text-3xl font-bold mb-3">AI-Powered Data Collection</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              WebAudit uses{" "}
              <a href="https://www.tinyfish.ai" target="_blank" rel="noopener noreferrer" style={{ color: SG }} className="hover:underline font-semibold">
                TinyFish
              </a>
              {" "}— enterprise infrastructure for AI web agents — as its primary data collector.
              Instead of a basic headless browser, TinyFish's AI agent navigates your site intelligently,
              extracting security signals that traditional scanners miss.
            </p>
          </div>

          {/* TinyFish feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto mb-12">
            {TINYFISH_FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="p-5 rounded-2xl border border-border/50 bg-card/40 hover:bg-card/70 transition-all duration-300 group"
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "oklch(0.90 0.22 155 / 0.30)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "")}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110" style={{ background: "oklch(0.90 0.22 155 / 0.10)" }}>
                  <Icon className="w-5 h-5" style={{ color: SG }} />
                </div>
                <h3 className="font-semibold mb-1.5 text-sm">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Architecture diagram / flow */}
          <div className="max-w-3xl mx-auto p-6 rounded-2xl border bg-card/30" style={{ borderColor: "oklch(0.90 0.22 155 / 0.15)" }}>
            <h3 className="text-sm font-semibold mb-5 text-center text-muted-foreground uppercase tracking-wider">How TinyFish Powers WebAudit</h3>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {[
                { icon: Globe, label: "Your URL", sub: "Any public website" },
                { icon: Sparkles, label: "TinyFish Agent", sub: "AI web navigation & extraction", highlight: true },
                { icon: Shield, label: "OWASP Engine", sub: "LLM01–LLM10 scoring" },
                { icon: BarChart3, label: "Results", sub: "Scores, grades & fixes" },
              ].map(({ icon: Icon, label, sub, highlight }, i, arr) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="flex flex-col items-center text-center">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-2"
                      style={highlight
                        ? { background: "oklch(0.90 0.22 155 / 0.15)", border: "1px solid oklch(0.90 0.22 155 / 0.50)" }
                        : { background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.10)" }
                      }
                    >
                      <Icon className="w-5 h-5" style={{ color: highlight ? SG : "oklch(0.60 0 0)" }} />
                    </div>
                    <span className="text-xs font-semibold" style={highlight ? { color: SG } : {}}>{label}</span>
                    <span className="text-xs text-muted-foreground mt-0.5 max-w-[90px]">{sub}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-border flex-shrink-0 hidden sm:block" />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-border/30 text-center">
              <a
                href="https://www.tinyfish.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
                style={{ color: SG }}
              >
                Learn more about TinyFish <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 border-t border-border/40">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Everything You Need to Know</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Six comprehensive audit categories — TinyFish collects the data, our OWASP LLM 2025 engine scores it.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, label, desc, color, bg }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="group p-5 rounded-2xl border border-border/50 bg-card/40 hover:bg-card/70 transition-all duration-300 cursor-default"
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "oklch(0.90 0.22 155 / 0.30)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "")}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110" style={{ background: bg }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <h3 className="font-semibold mb-1.5">{label}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 border-t border-border/40">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">How It Works</h2>
            <p className="text-muted-foreground">TinyFish collects. Our engine scores. You get results.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {STEPS.map(({ step, title, desc }, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                className="relative text-center p-6"
              >
                {i < STEPS.length - 1 && (
                  <ChevronRight className="absolute top-8 -right-3 w-6 h-6 text-border hidden md:block" />
                )}
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "oklch(0.90 0.22 155 / 0.10)", border: "1px solid oklch(0.90 0.22 155 / 0.25)" }}>
                  <span className="text-sm font-bold font-mono" style={{ color: SG }}>{step}</span>
                </div>
                <h3 className="font-semibold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                {/* TinyFish label on step 02 */}
                {i === 1 && (
                  <span className="inline-flex items-center gap-1 mt-2 text-xs px-2 py-0.5 rounded-full" style={{ background: "oklch(0.90 0.22 155 / 0.10)", color: SG_DIM }}>
                    🐟 TinyFish AI
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* OWASP LLM/GenAI Top 10 2025 Section */}
      <section className="py-20 border-t border-border/40">
        <div className="container">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 px-3 py-1 text-xs gap-1.5" style={{ borderColor: "oklch(0.90 0.22 155 / 0.35)", color: SG, background: "oklch(0.90 0.22 155 / 0.10)" }}>
              <Brain className="w-3 h-3" /> OWASP Top 10 for LLM &amp; GenAI Applications 2025
            </Badge>
            <h2 className="text-3xl font-bold mb-3">Full OWASP LLM &amp; GenAI 2025 Coverage</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Every security check is mapped to the{" "}
              <a href="https://genai.owasp.org/llm-top-10/" target="_blank" rel="noopener noreferrer" style={{ color: SG }} className="hover:underline">
                OWASP Top 10 for LLM &amp; GenAI Applications 2025
              </a>{" "}
              — the industry standard for securing AI-powered web applications (LLM01–LLM10).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 max-w-6xl mx-auto">
            {OWASP_LLM_ITEMS.map(({ id, label, desc, icon: Icon }, i) => (
              <motion.div
                key={id}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                className="group p-4 rounded-xl border border-border/50 bg-card/40 hover:bg-card/70 transition-all duration-300 cursor-default"
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "oklch(0.90 0.22 155 / 0.35)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "")}
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "oklch(0.90 0.22 155 / 0.12)" }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: SG }} />
                  </div>
                  <span className="text-xs font-black font-mono px-1.5 py-0.5 rounded" style={{ color: SG, background: "oklch(0.90 0.22 155 / 0.12)" }}>{id}</span>
                </div>
                <h3 className="text-sm font-semibold mb-1 leading-tight">{label}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-10 max-w-3xl mx-auto p-5 rounded-2xl border bg-card/30" style={{ borderColor: "oklch(0.90 0.22 155 / 0.15)" }}>
            <h3 className="text-sm font-semibold mb-4 text-center text-muted-foreground uppercase tracking-wider">What Gets Checked Per OWASP LLM Category</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
              {[
                ["LLM01", "CSP header, inline handlers, form action security"],
                ["LLM02", "API keys in HTML, server version, debug stack traces"],
                ["LLM03", "SRI on external scripts, CORS wildcard detection"],
                ["LLM04", "HTTPS enforcement, mixed content on HTTPS pages"],
                ["LLM05", "X-Content-Type-Options, X-Frame-Options, charset"],
                ["LLM06", "Permissions-Policy, COOP, COEP, open redirects"],
                ["LLM07", "System prompt patterns in HTML, hidden AI inputs"],
                ["LLM08", "HSTS, TLS validity & version, cookie security flags"],
                ["LLM09", "Referrer-Policy, X-XSS-Protection, console errors"],
                ["LLM10", "Rate-limit headers, compression, autocomplete on AI inputs"],
              ].map(([id, checks]) => (
                <div key={id} className="flex gap-2 py-1.5 border-b border-border/30 last:border-0">
                  <span className="text-xs font-mono font-bold w-12 flex-shrink-0" style={{ color: SG }}>{id}</span>
                  <span className="text-xs text-muted-foreground">{checks}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-border/40">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl font-bold mb-4">Ready to audit your site?</h2>
            <p className="text-muted-foreground mb-8">
              TinyFish AI collects the data. Our OWASP LLM 2025 engine scores it. You get a full report in under a minute — completely free.
            </p>
            <Button
              size="lg"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="gap-2 px-8 font-bold"
              style={{ background: SG, color: "oklch(0.08 0.005 155)", boxShadow: `0 4px 24px oklch(0.90 0.22 155 / 0.35)` }}
            >
              Start Free Audit <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4" style={{ color: SG }} />
            <span className="font-semibold text-foreground">WebAudit</span>
            <span>— OWASP LLM &amp; GenAI 2025 Security Auditing</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <a href="https://genai.owasp.org/llm-top-10/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors" style={{ color: "oklch(0.90 0.22 155 / 0.70)" }}>
              OWASP LLM Top 10 2025
            </a>
            <span>·</span>
            <a href="https://www.tinyfish.ai" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors flex items-center gap-1" style={{ color: "oklch(0.90 0.22 155 / 0.70)" }}>
              🐟 Powered by TinyFish
            </a>
            <span>·</span>
            <span>Headless Chrome Fallback</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
