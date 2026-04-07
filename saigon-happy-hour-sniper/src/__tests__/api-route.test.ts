import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockAgentStream, mockTinyFishCtor } = vi.hoisted(() => {
  const mockAgentStream = vi.fn();
  const mockTinyFishCtor = vi.fn(
    class {
      agent = {
        stream: mockAgentStream,
      };
    },
  );

  return { mockAgentStream, mockTinyFishCtor };
});

vi.mock("@tiny-fish/sdk", () => ({
  TinyFish: mockTinyFishCtor,
}));

async function importRoute() {
  vi.resetModules();
  return import("@/app/api/search/route");
}

function makeRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function readResponseBody(response: Response): Promise<string> {
  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(decoder.decode(value, { stream: true }));
  }

  return chunks.join("");
}

function makeMockStream(events: unknown[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const event of events) {
        yield event as never;
      }
    },
  };
}

describe("POST /api/search", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, TINYFISH_API_KEY: "test-key" };
    mockAgentStream.mockReset();
    mockTinyFishCtor.mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns 500 when TINYFISH_API_KEY is missing", async () => {
    delete process.env.TINYFISH_API_KEY;

    const { POST } = await importRoute();
    const res = await POST(makeRequest({ district: "d1" }));

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({
      error: "Missing TINYFISH_API_KEY",
    });
  });

  it("streams SDK snake_case events into the app SSE contract", async () => {
    const streamingUrl = "https://agent.tinyfish.ai/stream/abc123";

    mockAgentStream.mockImplementation(async (_params, options) => {
      const completeEvent = {
        type: "COMPLETE",
        run_id: "run_123",
        status: "COMPLETED",
        timestamp: "2026-03-31T00:00:00Z",
        result: {
          name: "The Deck",
          district: "d1",
          address: "123 Test St",
          website: "https://example.com",
          deals: [],
          notes: null,
        },
        error: null,
      };

      options?.onStarted?.({
        type: "STARTED",
        run_id: "run_123",
        timestamp: "2026-03-31T00:00:00Z",
      });
      options?.onStreamingUrl?.({
        type: "STREAMING_URL",
        run_id: "run_123",
        streaming_url: streamingUrl,
        timestamp: "2026-03-31T00:00:01Z",
      });
      options?.onComplete?.(completeEvent);

      return makeMockStream([
        {
          type: "STARTED",
          run_id: "run_123",
          timestamp: "2026-03-31T00:00:00Z",
        },
        {
          type: "STREAMING_URL",
          run_id: "run_123",
          streaming_url: streamingUrl,
          timestamp: "2026-03-31T00:00:01Z",
        },
        completeEvent,
      ]);
    });

    const { POST } = await importRoute();
    const res = await POST(makeRequest({ district: "d1" }));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    expect(mockTinyFishCtor).toHaveBeenCalledWith(
      expect.objectContaining({ timeout: 780_000 }),
    );
    expect(mockAgentStream).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.any(String),
        goal: expect.any(String),
      }),
      expect.objectContaining({
        onStreamingUrl: expect.any(Function),
        onComplete: expect.any(Function),
      }),
    );

    const body = await readResponseBody(res);
    expect(body).toContain("STREAMING_URL");
    expect(body).toContain("streamingUrl");
    expect(body).toContain("SEARCH_COMPLETE");
    expect(body).toContain('"cached":0');
  });
});
