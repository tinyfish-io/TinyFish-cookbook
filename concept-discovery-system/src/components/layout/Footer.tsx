export function Footer() {
  return (
    <footer className="border-t border-primary/20 bg-card/30 py-4 mt-8">
      <div className="container mx-auto px-4">
        <p className="text-xs text-muted-foreground text-center">
          Powered by{' '}
          <a
            href="https://tinyfish.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 transition-colors"
          >
            TinyFish
          </a>{' '}
          browser agents. Concept discovery results are AI-generated estimates — verify details directly.
        </p>
      </div>
    </footer>
  );
}
