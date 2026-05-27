'use strict';

const puppeteer = require('puppeteer');

// Use puppeteer's bundled Chrome by default (falls back to system chromium)
const DEFAULT_EXECUTABLE = (() => {
  try { return puppeteer.executablePath(); } catch { return '/usr/bin/chromium-browser'; }
})();

/**
 * BrowserRunner — manages a headless Chromium instance and page lifecycle.
 * Collects network requests, console messages, and performance timing data
 * during page load for downstream audit modules.
 */
class BrowserRunner {
  constructor(options = {}) {
    this.options = {
      timeout: options.timeout || 30000,
      userAgent: options.userAgent || 'WebAudit/1.0 (Headless Chrome Auditor)',
      viewport: options.viewport || { width: 1280, height: 800 },
      waitUntil: options.waitUntil || 'networkidle2',
      executablePath: options.executablePath || DEFAULT_EXECUTABLE,
    };
    this.browser = null;
    this.page = null;
  }

  async launch() {
    this.browser = await puppeteer.launch({
      headless: true,
      executablePath: this.options.executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-extensions',
      ],
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport(this.options.viewport);
    await this.page.setUserAgent(this.options.userAgent);
    await this.page.setDefaultNavigationTimeout(this.options.timeout);
  }

  async collectPageData(url) {
    const networkRequests = [];
    const consoleMessages = [];
    const failedRequests = [];
    const redirectChain = [];

    // Intercept all network requests
    await this.page.setRequestInterception(true);
    this.page.on('request', (req) => {
      networkRequests.push({
        url: req.url(),
        method: req.method(),
        resourceType: req.resourceType(),
        headers: req.headers(),
      });
      req.continue();
    });

    this.page.on('requestfailed', (req) => {
      failedRequests.push({
        url: req.url(),
        reason: req.failure() ? req.failure().errorText : 'Unknown',
        resourceType: req.resourceType(),
      });
    });

    this.page.on('console', (msg) => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
      });
    });

    // Navigate and capture response
    let mainResponse = null;
    try {
      const response = await this.page.goto(url, {
        waitUntil: this.options.waitUntil,
        timeout: this.options.timeout,
      });
      mainResponse = response;

      // Capture redirect chain
      if (response) {
        const chain = response.request().redirectChain();
        for (const r of chain) {
          redirectChain.push({ url: r.url(), status: r.response() ? r.response().status() : null });
        }
      }
    } catch (err) {
      throw new Error(`Navigation failed: ${err.message}`);
    }

    // Collect performance metrics via CDP
    const performanceMetrics = await this.page.metrics();

    // Collect Web Vitals and timing via JS evaluation
    const timingData = await this.page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] || {};
      const paint = {};
      performance.getEntriesByType('paint').forEach((e) => {
        paint[e.name] = e.startTime;
      });
      const resources = performance.getEntriesByType('resource').map((r) => ({
        name: r.name,
        initiatorType: r.initiatorType,
        duration: Math.round(r.duration),
        transferSize: r.transferSize || 0,
        encodedBodySize: r.encodedBodySize || 0,
      }));
      return {
        domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.startTime) || 0,
        loadTime: Math.round(nav.loadEventEnd - nav.startTime) || 0,
        ttfb: Math.round(nav.responseStart - nav.requestStart) || 0,
        domInteractive: Math.round(nav.domInteractive - nav.startTime) || 0,
        firstPaint: Math.round(paint['first-paint']) || 0,
        firstContentfulPaint: Math.round(paint['first-contentful-paint']) || 0,
        resources,
      };
    });

    // Collect full page HTML
    const html = await this.page.content();

    // Collect page title and meta
    const pageInfo = await this.page.evaluate(() => ({
      title: document.title,
      url: window.location.href,
      lang: document.documentElement.lang || '',
      charset: document.characterSet || '',
    }));

    // Collect response headers from main response
    const responseHeaders = mainResponse ? mainResponse.headers() : {};
    const statusCode = mainResponse ? mainResponse.status() : 0;

    // Collect cookies
    const cookies = await this.page.cookies();

    // Collect all scripts and their inline content
    const scripts = await this.page.evaluate(() =>
      Array.from(document.querySelectorAll('script')).map((s) => ({
        src: s.src || null,
        inline: !s.src ? s.textContent.substring(0, 500) : null,
        type: s.type || 'text/javascript',
      }))
    );

    // Collect all links
    const links = await this.page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href]')).map((a) => ({
        href: a.href,
        text: a.textContent.trim().substring(0, 100),
        rel: a.rel || '',
        target: a.target || '',
      }))
    );

    // Collect images
    const images = await this.page.evaluate(() =>
      Array.from(document.querySelectorAll('img')).map((img) => ({
        src: img.src,
        alt: img.alt,
        width: img.naturalWidth,
        height: img.naturalHeight,
        loading: img.loading || '',
      }))
    );

    // Collect forms
    const forms = await this.page.evaluate(() =>
      Array.from(document.querySelectorAll('form')).map((f) => ({
        action: f.action || '',
        method: f.method || 'get',
        hasAutocomplete: f.autocomplete !== 'off',
        inputs: Array.from(f.querySelectorAll('input')).map((i) => ({
          type: i.type,
          name: i.name,
          autocomplete: i.autocomplete || '',
          required: i.required,
        })),
      }))
    );

    // Take a screenshot for the report
    const screenshot = await this.page.screenshot({ encoding: 'base64', type: 'jpeg', quality: 60 });

    return {
      url,
      pageInfo,
      statusCode,
      responseHeaders,
      redirectChain,
      html,
      timingData,
      performanceMetrics,
      networkRequests,
      failedRequests,
      consoleMessages,
      cookies,
      scripts,
      links,
      images,
      forms,
      screenshot,
      auditedAt: new Date().toISOString(),
    };
  }

  /**
   * Lightweight screenshot-only capture — used when TinyFish handles data collection
   * but we still want a visual snapshot of the page.
   */
  async captureScreenshot(url) {
    if (!this.browser) throw new Error('Browser not launched');
    const page = await this.browser.newPage();
    try {
      await page.setViewport(this.options.viewport);
      await page.setUserAgent(this.options.userAgent);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.options.timeout });
      const screenshot = await page.screenshot({ encoding: 'base64', type: 'jpeg', quality: 60 });
      return screenshot;
    } finally {
      await page.close();
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

module.exports = BrowserRunner;
