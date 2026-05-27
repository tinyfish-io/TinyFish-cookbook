import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { submitAsync, pollRun, runAndParse } from '../client';

const BASE = 'https://agent.tinyfish.ai';

describe('submitAsync', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('POSTs to /run-async with X-API-Key header', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ run_id: 'run_123', error: null }),
    });
    const result = await submitAsync({ url: 'https://example.com', goal: 'test' });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${BASE}/v1/automation/run-async`,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': expect.any(String) },
        body: JSON.stringify({ url: 'https://example.com', goal: 'test' }),
      })
    );
    expect(result.run_id).toBe('run_123');
  });

  it('throws on HTTP error', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });
    await expect(submitAsync({ url: 'https://example.com', goal: 'test' })).rejects.toThrow(
      /TinyFish API error \(401\)/
    );
  });
});

describe('pollRun', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('GETs /v1/runs/{id}', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ run_id: 'run_123', status: 'COMPLETED', result: { ok: true }, error: null }),
    });
    const result = await pollRun('run_123');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${BASE}/v1/runs/run_123`,
      expect.objectContaining({
        headers: { 'X-API-Key': expect.any(String) },
      })
    );
    expect(result.status).toBe('COMPLETED');
  });
});

describe('runAndParse', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.fetch = originalFetch;
  });

  it('submits async then polls until COMPLETED', async () => {
    const payload = { scripts: [], globalVariables: ['__NEXT_DATA__'] };
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;

    // First call: submitAsync
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ run_id: 'run_abc', error: null }),
    });

    // Second call: pollRun -> RUNNING
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ run_id: 'run_abc', status: 'RUNNING', result: null, error: null }),
    });

    // Third call: pollRun -> COMPLETED
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ run_id: 'run_abc', status: 'COMPLETED', result: payload, error: null }),
    });

    const promise = runAndParse<typeof payload>({ url: 'https://example.com', goal: 'test' });

    // Advance past first poll interval
    await vi.advanceTimersByTimeAsync(3_000);
    // Advance past second poll interval
    await vi.advanceTimersByTimeAsync(3_000);

    const out = await promise;
    expect(out).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('throws when run status is FAILED', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;

    // submitAsync
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ run_id: 'run_fail', error: null }),
    });

    // pollRun -> FAILED
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ run_id: 'run_fail', status: 'FAILED', result: null, error: { message: 'Browser crashed' } }),
    });

    const promise = runAndParse<{ x: number }>({ url: 'https://example.com', goal: 'test' });

    await vi.advanceTimersByTimeAsync(3_000);

    await expect(promise).rejects.toThrow(/TinyFish automation failed/);
  });

  it('parses result when result is JSON string', async () => {
    const payload = { count: 42 };
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ run_id: 'run_str', error: null }),
    });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ run_id: 'run_str', status: 'COMPLETED', result: JSON.stringify(payload), error: null }),
    });

    const promise = runAndParse<{ count: number }>({ url: 'https://example.com', goal: 'test' });
    await vi.advanceTimersByTimeAsync(3_000);

    const out = await promise;
    expect(out).toEqual(payload);
  });
});
