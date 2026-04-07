import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { streamMock, tinyFishCtorMock } = vi.hoisted(() => ({
  streamMock: vi.fn(),
  tinyFishCtorMock: vi.fn(),
}));

vi.mock("@tiny-fish/sdk", () => ({
  BrowserProfile: { STEALTH: "stealth" },
  ProxyCountryCode: { VN: "VN" },
  RunStatus: { COMPLETED: "COMPLETED" },
  TinyFish: tinyFishCtorMock,
}));

vi.mock("@/lib/supabase", () => ({
  getSupabaseAdmin: () => {
    throw new Error("Supabase not configured");
  },
}));

async function importRoute() {
  vi.resetModules();
  return import("@/app/api/vibe/route");
}

function makeRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/vibe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createSdkStream(events: unknown[]) {
  return {
    close: vi.fn(),
    async *[Symbol.asyncIterator]() {
      for (const event of events) {
        yield event;
      }
    },
  };
}

function mockSuccessStream() {
  streamMock.mockImplementation(async () =>
    createSdkStream([
      {
        type: "STARTED",
        run_id: "run_2",
        timestamp: "2026-03-30T00:00:00Z",
      },
      {
        type: "STREAMING_URL",
        run_id: "run_2",
        streaming_url: "https://agent.tinyfish.ai/stream/run_2",
        timestamp: "2026-03-30T00:00:01Z",
      },
      {
        type: "COMPLETE",
        run_id: "run_2",
        status: "COMPLETED",
        timestamp: "2026-03-30T00:00:02Z",
        result: {
          district: "District 1",
          city: "hcmc",
          amenities: {},
          walkability_score: 8,
        },
        error: null,
      },
    ]),
  );

  tinyFishCtorMock.mockImplementation(() => ({
    agent: {
      stream: streamMock,
    },
  }));
}

describe("POST /api/vibe — validation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    streamMock.mockReset();
    tinyFishCtorMock.mockReset();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("returns 400 for invalid JSON body", async () => {
    process.env.TINYFISH_API_KEY = "test-key";

    const { POST } = await importRoute();
    const req = new Request("http://localhost:3000/api/vibe", {
      method: "POST",
      body: "not-json",
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Invalid JSON/i);
  });

  it('returns 400 for unsupported city (city: "invalid")', async () => {
    process.env.TINYFISH_API_KEY = "test-key";

    const { POST } = await importRoute();
    const res = await POST(makeRequest({ city: "invalid" }));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Unsupported city/i);
  });

  it("returns 500 when TINYFISH_API_KEY is missing", async () => {
    delete process.env.TINYFISH_API_KEY;

    const { POST } = await importRoute();
    const res = await POST(makeRequest({ city: "hcmc" }));

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/TINYFISH_API_KEY/i);
  });

  it("returns SSE stream with correct content-type when valid", async () => {
    process.env.TINYFISH_API_KEY = "test-key-123";
    mockSuccessStream();

    const { POST } = await importRoute();
    const res = await POST(makeRequest({ city: "hcmc" }));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
  });

  it("streams VIBE_COMPLETE and a live TinyFish preview URL", async () => {
    process.env.TINYFISH_API_KEY = "test-key-123";
    mockSuccessStream();

    const { POST } = await importRoute();
    const res = await POST(makeRequest({ city: "danang" }));

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

    expect(fullStream).toContain("STREAMING_URL");
    expect(fullStream).toContain("VIBE_COMPLETE");
    expect(fullStream).toContain("streamingUrl");
  }, 15000);
});
