// Wing Command v4 — Environment validation

export function validateEnv() {
  const required = ['GEMINI_API_KEY', 'TINYFISH_API_KEY'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.warn(`Missing env vars: ${missing.join(', ')}`);
  }
}
