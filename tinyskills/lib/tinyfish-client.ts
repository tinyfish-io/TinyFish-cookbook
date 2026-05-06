import { TinyFish } from "@tiny-fish/sdk";

let clientPromise: Promise<TinyFish> | null = null;

/** Shared TinyFish SDK client for Search, Fetch, and other APIs (`TINYFISH_API_KEY`). */
export async function getTinyFishClient(apiKey?: string): Promise<TinyFish> {
  if (!process.env.TINYFISH_API_KEY && apiKey) {
    process.env.TINYFISH_API_KEY = apiKey;
  }

  if (!clientPromise) {
    clientPromise = Promise.resolve(new TinyFish());
  }
  return clientPromise;
}
