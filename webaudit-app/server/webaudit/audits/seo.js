'use strict';

const { computeScore, item } = require('../utils/scoring');
const { parse } = require('node-html-parser');

/**
 * SEO Audit
 *
 * Checks: meta title, meta description, canonical, Open Graph, Twitter Card,
 * structured data, robots meta, sitemap, robots.txt, mobile-friendliness,
 * hreflang, image alt text, internal links, URL structure.
 */
const SEOAudit = {
  id: 'seo',
  title: 'SEO',
  description: 'Evaluates search engine discoverability and on-page SEO best practices.',

  async run({ pageData, robots, sitemap }) {
    const items = [];
    const { html, pageInfo, links, images } = pageData;
    const root = parse(html);

    // --- Title tag ---
    const titleEl = root.querySelector('title');
    const titleText = titleEl ? titleEl.text.trim() : '';
    if (!titleText) {
      items.push(item('meta-title', 'Meta Title', 'Page must have a <title> tag.', 'fail', 'Missing <title>', 3));
    } else if (titleText.length < 10) {
      items.push(item('meta-title', 'Meta Title', 'Page must have a <title> tag.', 'warn', `Title too short: "${titleText}" (${titleText.length} chars, target 30–60)`, 3));
    } else if (titleText.length > 60) {
      items.push(item('meta-title', 'Meta Title', 'Page must have a <title> tag.', 'warn', `Title too long: ${titleText.length} chars (target ≤60)`, 3));
    } else {
      items.push(item('meta-title', 'Meta Title', 'Page must have a <title> tag.', 'pass', `"${titleText}" (${titleText.length} chars)`, 3));
    }

    // --- Meta description ---
    const metaDesc = root.querySelector('meta[name="description"]');
    const descContent = metaDesc ? (metaDesc.getAttribute('content') || '').trim() : '';
    if (!descContent) {
      items.push(item('meta-desc', 'Meta Description', 'Page should have a meta description.', 'fail', 'Missing meta description', 2));
    } else if (descContent.length < 50) {
      items.push(item('meta-desc', 'Meta Description', 'Page should have a meta description.', 'warn', `Too short: ${descContent.length} chars (target 120–160)`, 2));
    } else if (descContent.length > 160) {
      items.push(item('meta-desc', 'Meta Description', 'Page should have a meta description.', 'warn', `Too long: ${descContent.length} chars (target ≤160)`, 2));
    } else {
      items.push(item('meta-desc', 'Meta Description', 'Page should have a meta description.', 'pass', `${descContent.length} chars`, 2));
    }

    // --- Canonical URL ---
    const canonical = root.querySelector('link[rel="canonical"]');
    if (canonical) {
      items.push(item('canonical', 'Canonical URL', 'Canonical tag prevents duplicate content issues.', 'pass', `href="${canonical.getAttribute('href')}"`, 2));
    } else {
      items.push(item('canonical', 'Canonical URL', 'Canonical tag prevents duplicate content issues.', 'warn', 'No canonical link tag found', 2));
    }

    // --- Robots meta tag ---
    const robotsMeta = root.querySelector('meta[name="robots"]');
    if (robotsMeta) {
      const content = robotsMeta.getAttribute('content') || '';
      if (content.includes('noindex')) {
        items.push(item('robots-meta', 'Robots Meta Tag', 'Page should be indexable unless intentionally hidden.', 'warn', `noindex directive found: "${content}"`, 2));
      } else {
        items.push(item('robots-meta', 'Robots Meta Tag', 'Page should be indexable unless intentionally hidden.', 'pass', `"${content}"`, 2));
      }
    } else {
      items.push(item('robots-meta', 'Robots Meta Tag', 'Robots meta tag controls indexing behaviour.', 'info', 'No robots meta tag (defaults to index, follow)', 1));
    }

    // --- Open Graph tags ---
    const ogTitle = root.querySelector('meta[property="og:title"]');
    const ogDesc = root.querySelector('meta[property="og:description"]');
    const ogImage = root.querySelector('meta[property="og:image"]');
    const ogUrl = root.querySelector('meta[property="og:url"]');
    const ogCount = [ogTitle, ogDesc, ogImage, ogUrl].filter(Boolean).length;
    if (ogCount === 4) {
      items.push(item('og-tags', 'Open Graph Tags', 'Open Graph tags improve social sharing appearance.', 'pass', 'All 4 core OG tags present', 1));
    } else if (ogCount > 0) {
      items.push(item('og-tags', 'Open Graph Tags', 'Open Graph tags improve social sharing appearance.', 'warn', `${ogCount}/4 OG tags present (missing: ${[!ogTitle && 'og:title', !ogDesc && 'og:description', !ogImage && 'og:image', !ogUrl && 'og:url'].filter(Boolean).join(', ')})`, 1));
    } else {
      items.push(item('og-tags', 'Open Graph Tags', 'Open Graph tags improve social sharing appearance.', 'warn', 'No Open Graph tags found', 1));
    }

    // --- Twitter Card ---
    const twitterCard = root.querySelector('meta[name="twitter:card"]');
    if (twitterCard) {
      items.push(item('twitter-card', 'Twitter Card', 'Twitter Card meta tags improve Twitter sharing.', 'pass', `card="${twitterCard.getAttribute('content')}"`, 1));
    } else {
      items.push(item('twitter-card', 'Twitter Card', 'Twitter Card meta tags improve Twitter sharing.', 'info', 'No Twitter Card meta tags found', 1));
    }

    // --- Structured data (JSON-LD / Schema.org) ---
    const jsonLdScripts = root.querySelectorAll('script[type="application/ld+json"]');
    if (jsonLdScripts.length > 0) {
      items.push(item('structured-data', 'Structured Data (JSON-LD)', 'Structured data helps search engines understand page content.', 'pass', `${jsonLdScripts.length} JSON-LD block(s) found`, 2));
    } else {
      const microdataItems = root.querySelectorAll('[itemtype]');
      if (microdataItems.length > 0) {
        items.push(item('structured-data', 'Structured Data (Microdata)', 'Structured data helps search engines understand page content.', 'pass', `${microdataItems.length} microdata item(s) found`, 2));
      } else {
        items.push(item('structured-data', 'Structured Data', 'Structured data helps search engines understand page content.', 'warn', 'No structured data (JSON-LD or Microdata) found', 2));
      }
    }

    // --- Robots.txt ---
    if (robots.found) {
      items.push(item('robots-txt', 'robots.txt', 'robots.txt controls crawler access.', 'pass', 'robots.txt found and accessible', 2));
    } else {
      items.push(item('robots-txt', 'robots.txt', 'robots.txt controls crawler access.', 'warn', 'robots.txt not found or inaccessible', 2));
    }

    // --- Sitemap ---
    if (sitemap.found) {
      items.push(item('sitemap', 'XML Sitemap', 'Sitemap helps search engines discover all pages.', 'pass', 'sitemap.xml found', 2));
    } else {
      items.push(item('sitemap', 'XML Sitemap', 'Sitemap helps search engines discover all pages.', 'warn', 'sitemap.xml not found at /sitemap.xml', 2));
    }

    // --- Image alt text for SEO ---
    const imagesWithAlt = images.filter((img) => img.alt && img.alt.trim() !== '');
    if (images.length === 0 || imagesWithAlt.length === images.length) {
      items.push(item('img-alt-seo', 'Image Alt Text (SEO)', 'Alt text helps search engines index images.', 'pass', `${imagesWithAlt.length}/${images.length} images have alt text`, 1));
    } else {
      items.push(item('img-alt-seo', 'Image Alt Text (SEO)', 'Alt text helps search engines index images.', 'warn', `${images.length - imagesWithAlt.length} image(s) missing alt text`, 1));
    }

    // --- hreflang ---
    const hreflang = root.querySelectorAll('link[hreflang]');
    items.push(item('hreflang', 'hreflang Tags', 'hreflang tags indicate language/region targeting.', 'info', hreflang.length > 0 ? `${hreflang.length} hreflang tag(s) found` : 'No hreflang tags (may not be needed)', 1));

    // --- Mobile viewport ---
    const viewport = root.querySelector('meta[name="viewport"]');
    if (viewport) {
      items.push(item('mobile-viewport', 'Mobile Viewport', 'Viewport meta tag is required for mobile-friendly pages.', 'pass', viewport.getAttribute('content') || '', 2));
    } else {
      items.push(item('mobile-viewport', 'Mobile Viewport', 'Viewport meta tag is required for mobile-friendly pages.', 'fail', 'Missing viewport meta tag', 2));
    }

    // --- URL length ---
    const urlLength = pageData.url.length;
    if (urlLength <= 75) {
      items.push(item('url-length', 'URL Length', 'URLs should be concise and descriptive.', 'pass', `${urlLength} characters`, 1));
    } else {
      items.push(item('url-length', 'URL Length', 'URLs should be concise and descriptive.', 'warn', `${urlLength} characters (target ≤75)`, 1));
    }

    const score = computeScore(items);
    return { id: 'seo', title: 'SEO', score, items };
  },
};

module.exports = SEOAudit;
