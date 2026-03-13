const STORAGE_KEY = "costlens_history";
const MAX_ENTRIES = 10;

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStore(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage full or unavailable — silently skip
  }
}

/**
 * Save a completed report to localStorage.
 * Stores a compact summary + the full report blob for later reload.
 */
export function saveReport(report) {
  if (!report) return;
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const entry = {
    id,
    target: report.target?.name || "Unknown",
    url: report.target?.url || "",
    scannedAt: report.scannedAt || new Date().toISOString(),
    completenessScore: report.quality?.completenessScore ?? 0,
    verdictLabel: report.executiveSummary?.verdictLabel || null,
    fullReport: report,
  };
  const entries = readStore();
  entries.unshift(entry);
  if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
  writeStore(entries);
  return id;
}

/** Returns compact summaries of saved reports (most recent first). */
export function getHistory() {
  return readStore().map(({ id, target, url, scannedAt, completenessScore, verdictLabel }) => ({
    id,
    target,
    url,
    scannedAt,
    completenessScore,
    verdictLabel,
  }));
}

/** Load the full report data for a saved entry. */
export function loadReport(id) {
  const entries = readStore();
  const entry = entries.find((e) => e.id === id);
  return entry?.fullReport || null;
}

/** Delete a single saved report. */
export function deleteReport(id) {
  const entries = readStore().filter((e) => e.id !== id);
  writeStore(entries);
}

/** Clear all saved reports. */
export function clearHistory() {
  writeStore([]);
}
