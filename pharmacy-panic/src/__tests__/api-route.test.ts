import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock @/lib/supabase BEFORE importing the route
vi.mock("@/lib/supabase", () => ({
  getSupabaseAdmin: vi.fn(() => {
    throw new Error("Supabase not configured");
  }),
}));

const sdkMock = vi.hoisted(() => {
  const state = {
    events: [] as Array<Record<string, unknown>>,
  };

  const stream = vi.fn(async () =>
    (async function* () {
      for (const event of state.events) {
        yield event;
      }
    })(),
  );

  const TinyFish = vi.fn(() => ({
    agent: {
      stream,
    },
  }));

  return { state, stream, TinyFish };
});

vi.mock("@tiny-fish/sdk", () => ({
  TinyFish: sdkMock.TinyFish,
}));

import { POST } from "@/app/api/search/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeInvalidJsonRequest(): Request {
  return new Request("http://localhost:3000/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "not valid json {{{",
  });
}

// ---------------------------------------------------------------------------
// Tests — request validation
// ---------------------------------------------------------------------------

describe("POST /api/search — validation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    sdkMock.state.events = [];
    sdkMock.stream.mockClear();
    sdkMock.TinyFish.mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("returns 400 for invalid JSON body", async () => {
    process.env.TINYFISH_API_KEY = "test-key";

    const res = await POST(makeInvalidJsonRequest());

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Invalid JSON/i);
  });

  it("returns 400 for empty body (missing query)", async () => {
    process.env.TINYFISH_API_KEY = "test-key";

    const res = await POST(makeRequest({}));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Missing search query/i);
  });

  it('returns 400 for { query: "" }', async () => {
    process.env.TINYFISH_API_KEY = "test-key";

    const res = await POST(makeRequest({ query: "" }));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Missing search query/i);
  });

  it("returns 400 for whitespace-only query", async () => {
    process.env.TINYFISH_API_KEY = "test-key";

    const res = await POST(makeRequest({ query: "   " }));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Missing search query/i);
  });

  it("returns 500 when TINYFISH_API_KEY is missing", async () => {
    delete process.env.TINYFISH_API_KEY;

    const res = await POST(makeRequest({ query: "paracetamol" }));

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/TINYFISH_API_KEY/i);
  });

  it("returns SSE stream with correct headers for valid request", async () => {
    process.env.TINYFISH_API_KEY = "test-key";
    sdkMock.state.events = [
      {
        type: "STARTED",
        run_id: "run_123",
        timestamp: "2026-03-31T00:00:00Z",
      },
      {
        type: "STREAMING_URL",
        run_id: "run_123",
        streaming_url: "https://stream.example.test/pharmacy",
        timestamp: "2026-03-31T00:00:01Z",
      },
      {
        type: "COMPLETE",
        run_id: "run_123",
        status: "COMPLETED",
        timestamp: "2026-03-31T00:00:02Z",
        result: {
          pharmacy: "Long Châu",
          search_term: "paracetamol",
          products: [],
        },
        error: null,
      },
    ];

    const res = await POST(makeRequest({ query: "paracetamol" }));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    expect(res.headers.get("Cache-Control")).toBe("no-cache, no-transform");
    expect(res.headers.get("Connection")).toBe("keep-alive");
    expect(sdkMock.TinyFish).toHaveBeenCalledWith({
      apiKey: "test-key",
      timeout: 780000,
      maxRetries: 0,
    });
    if (res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const chunks: string[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(decoder.decode(value, { stream: true }));
        }
      }
      const fullStream = chunks.join("");
      expect(fullStream).toContain("STREAMING_URL");
      expect(fullStream).toContain("PHARMACY_RESULT");
      expect(fullStream).toContain("SEARCH_COMPLETE");
      expect(fullStream).toContain("https://stream.example.test/pharmacy");
    }
  });

  it("SSE stream contains SEARCH_COMPLETE event on valid request", async () => {
    process.env.TINYFISH_API_KEY = "test-key";
    sdkMock.state.events = [
      {
        type: "STARTED",
        run_id: "run_456",
        timestamp: "2026-03-31T00:00:00Z",
      },
      {
        type: "STREAMING_URL",
        run_id: "run_456",
        streaming_url: "https://stream.example.test/pharmacy-2",
        timestamp: "2026-03-31T00:00:01Z",
      },
      {
        type: "COMPLETE",
        run_id: "run_456",
        status: "COMPLETED",
        timestamp: "2026-03-31T00:00:02Z",
        result: {
          pharmacy: "Pharmacity",
          search_term: "paracetamol",
          products: [],
        },
        error: null,
      },
    ];

    const res = await POST(makeRequest({ query: "paracetamol" }));
    expect(res.status).toBe(200);

    const chunks: string[] = [];
    if (res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(decoder.decode(value, { stream: true }));
      }
    }

    const fullStream = chunks.join("");

    expect(fullStream).toContain("SEARCH_COMPLETE");
  });
});
