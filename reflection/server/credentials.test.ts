import { describe, expect, it } from "vitest";
import { getRedis } from "./redis";

describe("API Credentials Validation", () => {
  it("should validate TinyFish API key exists", () => {
    const apiKey = process.env.TINYFISH_API_KEY;
    
    expect(apiKey).toBeDefined();
    expect(apiKey).not.toBe("");
    expect(typeof apiKey).toBe("string");
  });
  
  it("should validate Upstash Redis credentials exist", () => {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    expect(url).toBeDefined();
    expect(token).toBeDefined();
    expect(typeof url).toBe("string");
    expect(typeof token).toBe("string");
  });
});
