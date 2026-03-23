'use strict';

const BrowserRunner = require('./browser');
const Fetcher = require('./fetcher');
const { collectWithTinyFish } = require('./tinyfish-collector');

// Audit modules
const PerformanceAudit = require('../audits/performance');
const AccessibilityAudit = require('../audits/accessibility');
const SEOAudit = require('../audits/seo');
const BestPracticesAudit = require('../audits/best-practices');
const SecurityAudit = require('../audits/security');
const ComplianceAudit = require('../audits/compliance');

/**
 * AuditRunner — orchestrates the full audit pipeline:
 *
 * Data Collection Strategy:
 *   PRIMARY:  TinyFish web agent API (AI-powered, handles dynamic content, SPAs, anti-bot)
 *   FALLBACK: Puppeteer headless Chrome (local, always available)
 *
 * After data collection:
 *   - Parallel HTTP/TLS fetches via Fetcher (headers, TLS cert, robots.txt, sitemap)
 *   - All 6 audit modules run against the collected context
 *   - Scores aggregated into overall score
 */
class AuditRunner {
  constructor(options = {}) {
    this.options = options;
    // TinyFish API key from environment
    this.tinyfishApiKey = process.env.TINYFISH_API_KEY || options.tinyfishApiKey || null;
  }

  /**
   * Collect page data using TinyFish (primary) or Puppeteer (fallback).
   * Returns { pageData, collectedBy }
   */
  async collectPageData(url) {
    // Try TinyFish first if API key is available
    if (this.tinyfishApiKey) {
      try {
        console.log('[AuditRunner] Using TinyFish as data collector...');
        const pageData = await collectWithTinyFish(url, this.tinyfishApiKey);

        // TinyFish doesn't take a screenshot — capture one with Puppeteer quickly
        let screenshot = null;
        try {
          const browser = new BrowserRunner({ ...this.options, screenshotOnly: true });
          await browser.launch();
          screenshot = await browser.captureScreenshot(url);
          await browser.close();
        } catch {
          // Screenshot is optional — don't fail the whole audit
        }

        return {
          ...pageData,
          screenshot,
          auditedAt: new Date().toISOString(),
          _collectedBy: 'tinyfish',
        };
      } catch (err) {
        console.warn(`[AuditRunner] TinyFish collection failed, falling back to Puppeteer: ${err.message}`);
      }
    }

    // Fallback: Puppeteer headless browser
    console.log('[AuditRunner] Using Puppeteer as data collector...');
    const browser = new BrowserRunner(this.options);
    try {
      await browser.launch();
      const pageData = await browser.collectPageData(url);
      return { ...pageData, _collectedBy: 'puppeteer' };
    } finally {
      await browser.close();
    }
  }

  async run(url) {
    const pageData = await this.collectPageData(url);

    // Parallel HTTP-level data collection (always runs regardless of collector)
    const [headerData, tlsInfo, robotsData, sitemapData] = await Promise.allSettled([
      Fetcher.fetchHeaders(url),
      Fetcher.fetchTLSInfo(url),
      Fetcher.fetchRobotsTxt(url),
      Fetcher.fetchSitemap(url),
    ]);

    // Merge TinyFish-extracted headers with HTTP-fetched headers
    // HTTP-fetched headers take precedence for accuracy
    const fetchedHeaders = headerData.status === 'fulfilled' ? headerData.value : { headers: {}, statusCode: 0, redirects: [] };
    const mergedHeaders = {
      ...fetchedHeaders,
      headers: {
        ...(pageData.headers || {}),   // TinyFish-extracted headers as base
        ...fetchedHeaders.headers,      // HTTP-fetched headers override (more accurate)
      },
    };

    const context = {
      url,
      pageData,
      headers: mergedHeaders,
      tls: tlsInfo.status === 'fulfilled' ? tlsInfo.value : { supported: false },
      robots: robotsData.status === 'fulfilled' ? robotsData.value : { found: false },
      sitemap: sitemapData.status === 'fulfilled' ? sitemapData.value : { found: false },
      collectedBy: pageData._collectedBy || 'puppeteer',
    };

    // Run all audit modules in parallel
    const [performance, accessibility, seo, bestPractices, security, compliance] = await Promise.all([
      PerformanceAudit.run(context),
      AccessibilityAudit.run(context),
      SEOAudit.run(context),
      BestPracticesAudit.run(context),
      SecurityAudit.run(context),
      ComplianceAudit.run(context),
    ]);

    const categories = { performance, accessibility, seo, bestPractices, security, compliance };
    const overallScore = Math.round(
      Object.values(categories).reduce((sum, c) => sum + c.score, 0) / Object.keys(categories).length
    );

    return {
      url,
      auditedAt: pageData.auditedAt,
      screenshot: pageData.screenshot,
      pageInfo: pageData.pageInfo || {},
      statusCode: pageData.statusCode || 200,
      overallScore,
      categories,
      collectedBy: context.collectedBy,
    };
  }
}

module.exports = AuditRunner;
