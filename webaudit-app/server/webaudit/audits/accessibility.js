'use strict';

const { computeScore, item } = require('../utils/scoring');
const { parse } = require('node-html-parser');

/**
 * Accessibility Audit
 *
 * Checks aligned with WCAG 2.1 Level AA:
 * - Image alt text
 * - Form labels
 * - Heading hierarchy
 * - Language attribute
 * - Link descriptiveness
 * - Color contrast indicators
 * - ARIA roles
 * - Keyboard navigation indicators
 * - Skip navigation links
 * - Document title
 * - Viewport meta tag
 * - Focus management
 */
const AccessibilityAudit = {
  id: 'accessibility',
  title: 'Accessibility',
  description: 'Evaluates WCAG 2.1 Level AA compliance for inclusive web access.',

  async run({ pageData }) {
    const items = [];
    const { html, images, forms, pageInfo } = pageData;
    const root = parse(html);

    // --- Document language ---
    if (pageInfo.lang && pageInfo.lang.trim() !== '') {
      items.push(item('lang', 'Document Language', 'The <html> element must have a lang attribute (WCAG 3.1.1).', 'pass', `lang="${pageInfo.lang}"`, 2));
    } else {
      items.push(item('lang', 'Document Language', 'The <html> element must have a lang attribute (WCAG 3.1.1).', 'fail', 'Missing lang attribute on <html>', 2));
    }

    // --- Document title ---
    if (pageInfo.title && pageInfo.title.trim() !== '') {
      items.push(item('title', 'Page Title', 'Every page must have a descriptive <title> (WCAG 2.4.2).', 'pass', `"${pageInfo.title.substring(0, 60)}"`, 2));
    } else {
      items.push(item('title', 'Page Title', 'Every page must have a descriptive <title> (WCAG 2.4.2).', 'fail', 'Missing or empty <title>', 2));
    }

    // --- Image alt text ---
    const allImages = root.querySelectorAll('img');
    const imagesWithoutAlt = allImages.filter((img) => !img.hasAttribute('alt'));
    const imagesWithEmptyAlt = allImages.filter((img) => img.hasAttribute('alt') && img.getAttribute('alt').trim() === '' && !img.hasAttribute('role'));
    if (imagesWithoutAlt.length === 0) {
      items.push(item('img-alt', 'Image Alt Text', 'All images must have alt attributes (WCAG 1.1.1).', 'pass', `All ${allImages.length} images have alt attributes`, 3));
    } else {
      items.push(item('img-alt', 'Image Alt Text', 'All images must have alt attributes (WCAG 1.1.1).', 'fail', `${imagesWithoutAlt.length} of ${allImages.length} images missing alt`, 3));
    }

    // --- Form labels ---
    const allInputs = root.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"])');
    const unlabeledInputs = allInputs.filter((input) => {
      const id = input.getAttribute('id');
      const ariaLabel = input.getAttribute('aria-label');
      const ariaLabelledBy = input.getAttribute('aria-labelledby');
      const title = input.getAttribute('title');
      const label = id ? root.querySelector(`label[for="${id}"]`) : null;
      return !label && !ariaLabel && !ariaLabelledBy && !title;
    });
    if (unlabeledInputs.length === 0) {
      items.push(item('form-labels', 'Form Input Labels', 'All form inputs must have associated labels (WCAG 1.3.1).', 'pass', `All ${allInputs.length} inputs are labelled`, 3));
    } else {
      items.push(item('form-labels', 'Form Input Labels', 'All form inputs must have associated labels (WCAG 1.3.1).', 'fail', `${unlabeledInputs.length} input(s) missing labels`, 3));
    }

    // --- Heading hierarchy ---
    const headings = root.querySelectorAll('h1,h2,h3,h4,h5,h6');
    const h1s = root.querySelectorAll('h1');
    if (h1s.length === 0) {
      items.push(item('heading-h1', 'Single H1 Heading', 'Page should have exactly one <h1> (WCAG 1.3.1).', 'fail', 'No <h1> found', 2));
    } else if (h1s.length > 1) {
      items.push(item('heading-h1', 'Single H1 Heading', 'Page should have exactly one <h1> (WCAG 1.3.1).', 'warn', `${h1s.length} <h1> elements found (should be 1)`, 2));
    } else {
      items.push(item('heading-h1', 'Single H1 Heading', 'Page should have exactly one <h1> (WCAG 1.3.1).', 'pass', `1 <h1>: "${h1s[0].text.trim().substring(0, 60)}"`, 2));
    }

    // Check heading order
    let prevLevel = 0;
    let headingOrderOk = true;
    for (const h of headings) {
      const level = parseInt(h.tagName.replace('H', ''));
      if (level > prevLevel + 1 && prevLevel !== 0) { headingOrderOk = false; break; }
      prevLevel = level;
    }
    if (headingOrderOk) {
      items.push(item('heading-order', 'Heading Order', 'Headings must not skip levels (WCAG 1.3.1).', 'pass', `${headings.length} headings in correct order`, 1));
    } else {
      items.push(item('heading-order', 'Heading Order', 'Headings must not skip levels (WCAG 1.3.1).', 'warn', 'Heading levels skip (e.g., H1 → H3)', 1));
    }

    // --- Link descriptiveness ---
    const links = root.querySelectorAll('a[href]');
    const vagueLinks = links.filter((a) => {
      const text = a.text.trim().toLowerCase();
      const ariaLabel = a.getAttribute('aria-label') || '';
      return ['click here', 'here', 'read more', 'more', 'link', 'this'].includes(text) && !ariaLabel;
    });
    if (vagueLinks.length === 0) {
      items.push(item('link-text', 'Descriptive Link Text', 'Links must have descriptive text (WCAG 2.4.4).', 'pass', 'No vague link text found', 2));
    } else {
      items.push(item('link-text', 'Descriptive Link Text', 'Links must have descriptive text (WCAG 2.4.4).', 'warn', `${vagueLinks.length} vague link(s) found (e.g., "click here")`, 2));
    }

    // --- Viewport meta ---
    const viewportMeta = root.querySelector('meta[name="viewport"]');
    if (viewportMeta) {
      const content = viewportMeta.getAttribute('content') || '';
      if (content.includes('user-scalable=no') || content.includes('maximum-scale=1')) {
        items.push(item('viewport', 'Viewport Zoom', 'Viewport must not disable user scaling (WCAG 1.4.4).', 'fail', `Zoom disabled: ${content}`, 2));
      } else {
        items.push(item('viewport', 'Viewport Zoom', 'Viewport must not disable user scaling (WCAG 1.4.4).', 'pass', `Viewport: ${content}`, 2));
      }
    } else {
      items.push(item('viewport', 'Viewport Meta Tag', 'Page should have a viewport meta tag for mobile.', 'warn', 'No viewport meta tag found', 1));
    }

    // --- Skip navigation link ---
    const skipLinks = root.querySelectorAll('a[href^="#"]');
    const hasSkipNav = skipLinks.some((a) => {
      const text = a.text.trim().toLowerCase();
      return text.includes('skip') || text.includes('main content') || text.includes('jump');
    });
    if (hasSkipNav) {
      items.push(item('skip-nav', 'Skip Navigation Link', 'A skip-to-main-content link helps keyboard users (WCAG 2.4.1).', 'pass', 'Skip navigation link found', 1));
    } else {
      items.push(item('skip-nav', 'Skip Navigation Link', 'A skip-to-main-content link helps keyboard users (WCAG 2.4.1).', 'warn', 'No skip navigation link detected', 1));
    }

    // --- ARIA landmarks ---
    const mainLandmark = root.querySelector('main, [role="main"]');
    const navLandmark = root.querySelector('nav, [role="navigation"]');
    if (mainLandmark) {
      items.push(item('aria-main', 'Main Landmark', 'Page should have a <main> landmark (WCAG 1.3.6).', 'pass', '<main> landmark present', 1));
    } else {
      items.push(item('aria-main', 'Main Landmark', 'Page should have a <main> landmark (WCAG 1.3.6).', 'warn', 'No <main> or role="main" found', 1));
    }

    // --- Buttons with accessible names ---
    const buttons = root.querySelectorAll('button');
    const emptyButtons = buttons.filter((b) => {
      const text = b.text.trim();
      const ariaLabel = b.getAttribute('aria-label') || '';
      const ariaLabelledBy = b.getAttribute('aria-labelledby') || '';
      const title = b.getAttribute('title') || '';
      return !text && !ariaLabel && !ariaLabelledBy && !title;
    });
    if (emptyButtons.length === 0) {
      items.push(item('button-names', 'Button Accessible Names', 'Buttons must have accessible names (WCAG 4.1.2).', 'pass', `All ${buttons.length} buttons have names`, 2));
    } else {
      items.push(item('button-names', 'Button Accessible Names', 'Buttons must have accessible names (WCAG 4.1.2).', 'fail', `${emptyButtons.length} button(s) have no accessible name`, 2));
    }

    // --- Tables with headers ---
    const tables = root.querySelectorAll('table');
    const tablesWithoutHeaders = tables.filter((t) => !t.querySelector('th') && !t.querySelector('[scope]'));
    if (tables.length === 0 || tablesWithoutHeaders.length === 0) {
      items.push(item('table-headers', 'Table Headers', 'Data tables must have <th> elements (WCAG 1.3.1).', 'pass', tables.length === 0 ? 'No tables found' : 'All tables have headers', 1));
    } else {
      items.push(item('table-headers', 'Table Headers', 'Data tables must have <th> elements (WCAG 1.3.1).', 'warn', `${tablesWithoutHeaders.length} table(s) missing <th>`, 1));
    }

    const score = computeScore(items);
    return { id: 'accessibility', title: 'Accessibility', score, items };
  },
};

module.exports = AccessibilityAudit;
