import fs from "node:fs";
import path from "node:path";

let loaded = false;

function parseEnvLine(line: string): { key: string; value: string } | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const idx = trimmed.indexOf("=");
  if (idx === -1) return null;
  const key = trimmed.slice(0, idx).trim();
  let value = trimmed.slice(idx + 1).trim();
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return { key, value };
}

export function ensureLocalEnvLoaded() {
  if (loaded) return;
  loaded = true;

  if (process.env.NODE_ENV === "production") return;

  const envPath = path.join(process.cwd(), ".env.local");
  try {
    const content = fs.readFileSync(envPath, "utf8");
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const parsed = parseEnvLine(line);
      if (!parsed) continue;
      const existing = process.env[parsed.key];
      if (existing === undefined || existing === "") {
        process.env[parsed.key] = parsed.value;
      }
    }
  } catch {
    // Ignore missing env file in dev.
  }
}
