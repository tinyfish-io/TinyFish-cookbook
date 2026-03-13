import assert from "node:assert/strict";
import test from "node:test";
import {
  collectMachineReadabilitySignals,
  collectPageLlmoSignals,
} from "@/lib/llmo-signals";

const originalFetch = globalThis.fetch;

test("collectPageLlmoSignals extracts schema and metadata", async () => {
  globalThis.fetch = (async () => {
    return new Response(
      `
      <html>
        <head>
          <meta name="author" content="Jane Doe" />
          <meta property="article:published_time" content="2025-01-01" />
          <link rel="canonical" href="https://example.com/post" />
          <script type="application/ld+json">
            {"@context":"https://schema.org","@type":"Organization","name":"Acme"}
          </script>
        </head>
        <body>
          <h1>Acme Product</h1>
          <h2>Pricing</h2>
          <p>Acme is a platform for teams.</p>
          <p>It offers API integrations.</p>
        </body>
      </html>
      `,
      { status: 200 }
    );
  }) as typeof fetch;

  const result = await collectPageLlmoSignals("https://example.com");
  assert.equal(result.structuredData.hasJsonLd, true);
  assert.equal(result.authority.hasAuthor, true);
  assert.equal(result.extractability.hasH1, true);
});

test("collectMachineReadabilitySignals detects files and robots sitemap hint", async () => {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/robots.txt")) {
      return new Response("User-agent: *\nSitemap: https://example.com/sitemap.xml", {
        status: 200,
      });
    }
    if (url.endsWith("/sitemap.xml")) {
      return new Response("<urlset></urlset>", { status: 200 });
    }
    if (url.endsWith("/llms.txt")) {
      return new Response("# llms", { status: 200 });
    }
    return new Response("", { status: 404 });
  }) as typeof fetch;

  const result = await collectMachineReadabilitySignals("https://example.com/docs");
  assert.equal(result.hasRobotsTxt, true);
  assert.equal(result.hasSitemapXml, true);
  assert.equal(result.hasLlmsTxt, true);
});

test.after(() => {
  globalThis.fetch = originalFetch;
});
