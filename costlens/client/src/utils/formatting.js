export const fmt = (n) => {
  const value = Number(n);
  if (!Number.isFinite(value)) return "$0";
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
};

export const fmtRange = (low, high) => `${fmt(low)}–${fmt(high)}`;

export const toNum = (n, fallback = 0) => {
  const value = Number(n);
  return Number.isFinite(value) ? value : fallback;
};

export const toText = (value, fallback = "Unknown") => {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
};

/** Returns true when a number is finite and non-zero. */
export const hasValue = (n) => Number.isFinite(Number(n)) && Number(n) !== 0;

/** Returns true when at least one of low/mid/high is non-zero. */
export const hasRange = (obj) =>
  hasValue(obj?.low) || hasValue(obj?.mid) || hasValue(obj?.high);
