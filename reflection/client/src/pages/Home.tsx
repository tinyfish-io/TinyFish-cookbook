import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
              R
            </div>
            <span className="font-semibold text-xl">Reflection</span>
          </div>
          <nav className="flex items-center gap-6">
            <a href="/feed" className="text-sm font-medium hover:text-primary transition-colors">
              Feed
            </a>
            <a href="/sources" className="text-sm font-medium hover:text-primary transition-colors">
              Sources
            </a>
            <a href="/settings" className="text-sm font-medium hover:text-primary transition-colors">
              Settings
            </a>
            <Button asChild>
              <a href="/feed">Get Started</a>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container py-24 md:py-32">
        <div className="mx-auto max-w-3xl text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Tell Reflection what to follow
            </h1>
            <p className="text-xl text-muted-foreground">
              Privately browses your LinkedIn, X, podcasts, newsletters, websites
            </p>
          </div>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Stay informed without feeling overwhelmed. Reflection aggregates content from your favorite sources, 
            uses AI to summarize and categorize everything, then presents it in a calm, beautiful interface.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <a href="/feed">Start Reading</a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="/sources">Add Sources</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container pb-24">
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="space-y-3 text-center">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto">
              <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg">AI-Powered Summaries</h3>
            <p className="text-sm text-muted-foreground">
              Every article condensed to 2-3 sentences. Get the key insights without the noise.
            </p>
          </div>

          <div className="space-y-3 text-center">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto">
              <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg">Three Viewing Modes</h3>
            <p className="text-sm text-muted-foreground">
              Inbox for scanning, Magazine for reading, Cards for browsing. Choose what fits your mood.
            </p>
          </div>

          <div className="space-y-3 text-center">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto">
              <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg">Daily Digests</h3>
            <p className="text-sm text-muted-foreground">
              Automated summaries delivered twice daily. Never miss important updates.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container pb-24">
        <div className="mx-auto max-w-2xl rounded-2xl bg-primary/5 p-8 md:p-12 text-center space-y-6">
          <h2 className="text-3xl font-bold">Ready to take control of your information diet?</h2>
          <p className="text-muted-foreground">
            Join thousands staying informed without the overwhelm.
          </p>
          <Button size="lg" asChild>
            <a href="/feed">Start Your Feed</a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>Built with Next.js, TinyFish, and Upstash Redis</p>
        </div>
      </footer>
    </div>
  );
}
