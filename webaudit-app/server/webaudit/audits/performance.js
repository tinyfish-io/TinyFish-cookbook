'use strict';

const { computeScore, item } = require('../utils/scoring');

/**
 * Performance Audit
 *
 * Checks: TTFB, FCP, DOM load time, total page weight, image optimisation,
 * render-blocking resources, resource count, compression, caching headers.
 */
const PerformanceAudit = {
  id: 'performance',
  title: 'Performance',
  description: 'Measures page load speed, resource efficiency, and Web Vitals.',

  async run({ pageData, headers }) {
    const items = [];
    const { timingData, networkRequests, images, responseHeaders } = pageData;
    const hdrs = { ...responseHeaders, ...(headers.headers || {}) };

    // --- TTFB ---
    const ttfb = timingData.ttfb;
    if (ttfb === 0) {
      items.push(item('ttfb', 'Time to First Byte (TTFB)', 'Server response time.', 'info', 'Could not measure TTFB.', 2));
    } else if (ttfb <= 200) {
      items.push(item('ttfb', 'Time to First Byte (TTFB)', 'Server response time.', 'pass', `${ttfb}ms — Excellent`, 2));
    } else if (ttfb <= 600) {
      items.push(item('ttfb', 'Time to First Byte (TTFB)', 'Server response time.', 'warn', `${ttfb}ms — Acceptable (target ≤200ms)`, 2));
    } else {
      items.push(item('ttfb', 'Time to First Byte (TTFB)', 'Server response time.', 'fail', `${ttfb}ms — Slow (target ≤200ms)`, 2));
    }

    // --- First Contentful Paint ---
    const fcp = timingData.firstContentfulPaint;
    if (fcp === 0) {
      items.push(item('fcp', 'First Contentful Paint (FCP)', 'Time until first content is painted.', 'info', 'Could not measure FCP.', 2));
    } else if (fcp <= 1800) {
      items.push(item('fcp', 'First Contentful Paint (FCP)', 'Time until first content is painted.', 'pass', `${fcp}ms — Good`, 2));
    } else if (fcp <= 3000) {
      items.push(item('fcp', 'First Contentful Paint (FCP)', 'Time until first content is painted.', 'warn', `${fcp}ms — Needs improvement (target ≤1800ms)`, 2));
    } else {
      items.push(item('fcp', 'First Contentful Paint (FCP)', 'Time until first content is painted.', 'fail', `${fcp}ms — Poor (target ≤1800ms)`, 2));
    }

    // --- DOM Content Loaded ---
    const dcl = timingData.domContentLoaded;
    if (dcl <= 1500) {
      items.push(item('dcl', 'DOM Content Loaded', 'Time until HTML is fully parsed.', 'pass', `${dcl}ms`, 1));
    } else if (dcl <= 3500) {
      items.push(item('dcl', 'DOM Content Loaded', 'Time until HTML is fully parsed.', 'warn', `${dcl}ms (target ≤1500ms)`, 1));
    } else {
      items.push(item('dcl', 'DOM Content Loaded', 'Time until HTML is fully parsed.', 'fail', `${dcl}ms (target ≤1500ms)`, 1));
    }

    // --- Total Page Load Time ---
    const loadTime = timingData.loadTime;
    if (loadTime <= 3000) {
      items.push(item('load-time', 'Total Page Load Time', 'Full page load including all resources.', 'pass', `${loadTime}ms`, 2));
    } else if (loadTime <= 6000) {
      items.push(item('load-time', 'Total Page Load Time', 'Full page load including all resources.', 'warn', `${loadTime}ms (target ≤3000ms)`, 2));
    } else {
      items.push(item('load-time', 'Total Page Load Time', 'Full page load including all resources.', 'fail', `${loadTime}ms (target ≤3000ms)`, 2));
    }

    // --- Total page weight ---
    const resources = timingData.resources || [];
    const totalTransfer = resources.reduce((s, r) => s + (r.transferSize || 0), 0);
    const totalKB = Math.round(totalTransfer / 1024);
    if (totalKB <= 1000) {
      items.push(item('page-weight', 'Total Page Weight', 'Total bytes transferred for all resources.', 'pass', `${totalKB} KB`, 1));
    } else if (totalKB <= 3000) {
      items.push(item('page-weight', 'Total Page Weight', 'Total bytes transferred for all resources.', 'warn', `${totalKB} KB (target ≤1000 KB)`, 1));
    } else {
      items.push(item('page-weight', 'Total Page Weight', 'Total bytes transferred for all resources.', 'fail', `${totalKB} KB (target ≤1000 KB)`, 1));
    }

    // --- Resource count ---
    const reqCount = networkRequests.length;
    if (reqCount <= 50) {
      items.push(item('request-count', 'HTTP Request Count', 'Total number of network requests.', 'pass', `${reqCount} requests`, 1));
    } else if (reqCount <= 100) {
      items.push(item('request-count', 'HTTP Request Count', 'Total number of network requests.', 'warn', `${reqCount} requests (target ≤50)`, 1));
    } else {
      items.push(item('request-count', 'HTTP Request Count', 'Total number of network requests.', 'fail', `${reqCount} requests (target ≤50)`, 1));
    }

    // --- Images without explicit dimensions ---
    const imagesNoDimensions = images.filter((img) => !img.width && !img.height);
    if (imagesNoDimensions.length === 0) {
      items.push(item('img-dimensions', 'Image Dimensions Specified', 'Images should have explicit width/height to prevent layout shift.', 'pass', 'All images have dimensions', 1));
    } else {
      items.push(item('img-dimensions', 'Image Dimensions Specified', 'Images should have explicit width/height to prevent layout shift.', 'warn', `${imagesNoDimensions.length} image(s) missing dimensions`, 1));
    }

    // --- Lazy loading images ---
    const imagesAboveFold = images.slice(0, 5);
    const lazyImages = images.filter((img) => img.loading === 'lazy');
    if (images.length > 3 && lazyImages.length === 0) {
      items.push(item('lazy-loading', 'Lazy Loading Images', 'Images below the fold should use loading="lazy".', 'warn', `0 of ${images.length} images use lazy loading`, 1));
    } else {
      items.push(item('lazy-loading', 'Lazy Loading Images', 'Images below the fold should use loading="lazy".', 'pass', `${lazyImages.length} of ${images.length} images use lazy loading`, 1));
    }

    // --- Compression (gzip/brotli) ---
    const encoding = hdrs['content-encoding'] || '';
    if (encoding.includes('br') || encoding.includes('gzip') || encoding.includes('deflate')) {
      items.push(item('compression', 'Response Compression', 'Server should compress responses with gzip or brotli.', 'pass', `Encoding: ${encoding}`, 2));
    } else {
      items.push(item('compression', 'Response Compression', 'Server should compress responses with gzip or brotli.', 'warn', 'No compression detected on main response', 2));
    }

    // --- Browser caching headers ---
    const cacheControl = hdrs['cache-control'] || '';
    if (cacheControl && !cacheControl.includes('no-store') && !cacheControl.includes('no-cache')) {
      items.push(item('caching', 'Browser Caching', 'Cache-Control header enables browser caching.', 'pass', `Cache-Control: ${cacheControl}`, 1));
    } else if (cacheControl.includes('no-store') || cacheControl.includes('no-cache')) {
      items.push(item('caching', 'Browser Caching', 'Cache-Control header enables browser caching.', 'warn', `Caching disabled: ${cacheControl}`, 1));
    } else {
      items.push(item('caching', 'Browser Caching', 'Cache-Control header enables browser caching.', 'warn', 'No Cache-Control header found', 1));
    }

    // --- JavaScript resource count ---
    const jsResources = resources.filter((r) => r.initiatorType === 'script');
    if (jsResources.length <= 10) {
      items.push(item('js-count', 'JavaScript File Count', 'Excessive JS files increase parse time.', 'pass', `${jsResources.length} JS files`, 1));
    } else if (jsResources.length <= 20) {
      items.push(item('js-count', 'JavaScript File Count', 'Excessive JS files increase parse time.', 'warn', `${jsResources.length} JS files (target ≤10)`, 1));
    } else {
      items.push(item('js-count', 'JavaScript File Count', 'Excessive JS files increase parse time.', 'fail', `${jsResources.length} JS files (target ≤10)`, 1));
    }

    // --- CSS resource count ---
    const cssResources = resources.filter((r) => r.initiatorType === 'link' && r.name.includes('.css'));
    if (cssResources.length <= 5) {
      items.push(item('css-count', 'CSS File Count', 'Excessive CSS files delay rendering.', 'pass', `${cssResources.length} CSS files`, 1));
    } else {
      items.push(item('css-count', 'CSS File Count', 'Excessive CSS files delay rendering.', 'warn', `${cssResources.length} CSS files (target ≤5)`, 1));
    }

    const score = computeScore(items);
    return { id: 'performance', title: 'Performance', score, items };
  },
};

module.exports = PerformanceAudit;
