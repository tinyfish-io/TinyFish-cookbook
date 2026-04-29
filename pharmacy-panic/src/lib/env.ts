const apiKey = process.env.TINYFISH_API_KEY;

if (!apiKey) {
  throw new Error("Missing TINYFISH_API_KEY environment variable");
}

export const env = {
  TINYFISH_API_KEY: apiKey,
};
