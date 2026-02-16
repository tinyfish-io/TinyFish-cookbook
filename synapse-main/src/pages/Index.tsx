import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Shield, Code2, Eye, ArrowRight, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";

const CODE_EXAMPLE = `// Define an action
const action = {
  name: "add-to-cart",
  steps: [
    { type: "navigate", url: "https://store.com" },
    { type: "click", selector: "#product-1" },
    { type: "click", selector: ".add-to-cart" },
    { type: "extract", selector: ".cart-total" }
  ]
};

// Execute via API
const result = await synapse.execute(action);
// → { status: "success", cart_total: "$29.99" }`;

const FEATURES = [
  {
    icon: Shield,
    title: "Anti-Fragile",
    description: "Visual intelligence means no more brittle selectors. If a button moves, Synapse still finds it.",
  },
  {
    icon: Code2,
    title: "Simple API",
    description: "One POST request. Clean JSON response. Your AI agent doesn't need to understand the DOM.",
  },
  {
    icon: Eye,
    title: "Visual Intelligence",
    description: "Powered by computer vision, Synapse sees the web like a human — not like a parser.",
  },
];

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 glow-cyan-sm">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Synapse</span>
          </div>
          <Link to="/playground">
            <Button size="sm" className="gap-2">
              Open Dashboard <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden pt-14">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px]" />
        
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
              Universal Action API — Now in Developer Preview
            </div>
            <h1 className="mb-6 text-5xl font-bold tracking-tight md:text-7xl">
              Give your AI agents{" "}
              <span className="text-gradient">hands</span>
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground leading-relaxed">
              The infrastructure layer that lets any AI agent click, type, and navigate the web reliably.
              You send the intent — we handle the messy reality.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link to="/playground">
                <Button size="lg" className="gap-2 glow-cyan">
                  <Terminal className="h-4 w-4" />
                  Open Playground
                </Button>
              </Link>
              <Link to="/library">
                <Button size="lg" variant="outline" className="gap-2">
                  View Examples
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid gap-8 md:grid-cols-3">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="rounded-xl border border-border bg-card p-6"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Code Example */}
      <section className="border-t border-border py-24">
        <div className="mx-auto max-w-4xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">One API call. Real results.</h2>
            <p className="text-muted-foreground">Define actions as JSON, execute via REST, get structured data back.</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-xl border border-border bg-card overflow-hidden"
          >
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-destructive/60" />
              <span className="h-3 w-3 rounded-full bg-warning/60" />
              <span className="h-3 w-3 rounded-full bg-success/60" />
              <span className="ml-3 text-xs font-mono text-muted-foreground">action.ts</span>
            </div>
            <pre className="p-6 text-sm font-mono text-muted-foreground overflow-x-auto leading-relaxed">
              <code>{CODE_EXAMPLE}</code>
            </pre>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-5xl px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span>Synapse — Universal Action API</span>
          </div>
          <span className="text-xs text-muted-foreground">Developer Preview</span>
        </div>
      </footer>
    </div>
  );
}
