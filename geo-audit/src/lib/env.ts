export function parseEnvNumber(
  name: string,
  fallback: number,
  options: { min?: number; max?: number } = {}
) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  if (options.min !== undefined && parsed < options.min) return options.min;
  if (options.max !== undefined && parsed > options.max) return options.max;
  return parsed;
}
