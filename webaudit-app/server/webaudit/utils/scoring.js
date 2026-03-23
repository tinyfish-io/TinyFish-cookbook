'use strict';

/**
 * Scoring utilities shared across all audit modules.
 *
 * Each audit item has:
 *   - id: string identifier
 *   - title: human-readable name
 *   - description: what was checked
 *   - result: 'pass' | 'fail' | 'warn' | 'info'
 *   - details: additional context string
 *   - weight: relative importance (1–3)
 *   - score: 0–100 for this item
 */

const WEIGHTS = { critical: 3, major: 2, minor: 1 };

/**
 * Compute a category score from an array of audit items.
 * Items with result='info' do not affect the score.
 * @param {Array} items
 * @returns {number} 0–100
 */
function computeScore(items) {
  const scorable = items.filter((i) => i.result !== 'info');
  if (scorable.length === 0) return 100;

  let totalWeight = 0;
  let earnedWeight = 0;

  for (const item of scorable) {
    const w = item.weight || 1;
    totalWeight += w;
    if (item.result === 'pass') {
      earnedWeight += w;
    } else if (item.result === 'warn') {
      earnedWeight += w * 0.5;
    }
    // 'fail' contributes 0
  }

  return totalWeight === 0 ? 100 : Math.round((earnedWeight / totalWeight) * 100);
}

/**
 * Return a letter grade and colour label for a numeric score.
 * @param {number} score
 * @returns {{ grade: string, label: string, color: string }}
 */
function gradeScore(score) {
  if (score >= 90) return { grade: 'A', label: 'Excellent', color: 'green' };
  if (score >= 75) return { grade: 'B', label: 'Good', color: 'cyan' };
  if (score >= 50) return { grade: 'C', label: 'Needs Improvement', color: 'yellow' };
  if (score >= 25) return { grade: 'D', label: 'Poor', color: 'red' };
  return { grade: 'F', label: 'Critical', color: 'red' };
}

/**
 * Build a standard audit item object.
 */
function item(id, title, description, result, details = '', weight = 1) {
  return { id, title, description, result, details, weight };
}

module.exports = { computeScore, gradeScore, item, WEIGHTS };
