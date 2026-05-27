import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Mock DB helpers ────────────────────────────────────────────────────────────

vi.mock("./db", () => ({
  createAudit: vi.fn().mockResolvedValue(1),
  getAuditById: vi.fn().mockResolvedValue({
    id: 1,
    slug: "testslug01",
    url: "https://example.com",
    status: "completed",
    overallScore: 80,
    results: { overallScore: 80, url: "https://example.com", categories: {} },
    errorMessage: null,
    createdAt: new Date(),
    completedAt: new Date(),
  }),
  getAuditBySlug: vi.fn().mockResolvedValue({
    id: 1,
    slug: "testslug01",
    url: "https://example.com",
    status: "completed",
    overallScore: 80,
    results: { overallScore: 80, url: "https://example.com", categories: {} },
    errorMessage: null,
    createdAt: new Date(),
    completedAt: new Date(),
  }),
  getRecentAudits: vi.fn().mockResolvedValue([
    { id: 1, slug: "testslug01", url: "https://example.com", overallScore: 80, createdAt: new Date(), completedAt: new Date() },
  ]),
  updateAudit: vi.fn().mockResolvedValue(undefined),
  countRecentAuditsByIp: vi.fn().mockResolvedValue(0),
}));

vi.mock("./auditRunner", () => ({
  runAudit: vi.fn().mockResolvedValue({
    url: "https://example.com",
    auditedAt: new Date().toISOString(),
    statusCode: 200,
    pageInfo: { title: "Example", lang: "en", description: "" },
    overallScore: 80,
    categories: {},
  }),
}));

// ── Test context factory ───────────────────────────────────────────────────────

function makeCtx(): TrpcContext {
  return {
    user: null,
    req: {
      headers: { "x-forwarded-for": "1.2.3.4" },
      socket: { remoteAddress: "1.2.3.4" },
      protocol: "https",
    } as any,
    res: {
      clearCookie: vi.fn(),
    } as any,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("audit.start", () => {
  it("rejects an invalid URL", async () => {
    const caller = appRouter.createCaller(makeCtx());
    // A URL with spaces cannot be parsed by new URL() and will fail isValidUrl
    await expect(caller.audit.start({ url: "https://not a valid url .com" })).rejects.toThrow(TRPCError);
  });

  it("rejects localhost URLs", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.audit.start({ url: "http://localhost:3000" })).rejects.toThrow(TRPCError);
  });

  it("accepts a valid public URL and returns auditId + slug", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.audit.start({ url: "https://example.com" });
    expect(result).toHaveProperty("auditId");
    expect(result).toHaveProperty("slug");
    expect(typeof result.auditId).toBe("number");
    expect(typeof result.slug).toBe("string");
  });

  it("auto-prepends https:// to bare domains", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.audit.start({ url: "example.com" });
    expect(result).toHaveProperty("auditId");
  });

  it("rejects when rate limit is exceeded", async () => {
    const { countRecentAuditsByIp } = await import("./db");
    vi.mocked(countRecentAuditsByIp).mockResolvedValueOnce(5);
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.audit.start({ url: "https://example.com" })).rejects.toThrow(TRPCError);
  });
});

describe("audit.status", () => {
  it("returns audit data for a valid id", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.audit.status({ auditId: 1 });
    expect(result.id).toBe(1);
    expect(result.status).toBe("completed");
    expect(result.overallScore).toBe(80);
  });

  it("throws NOT_FOUND for unknown id", async () => {
    const { getAuditById } = await import("./db");
    vi.mocked(getAuditById).mockResolvedValueOnce(undefined);
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.audit.status({ auditId: 9999 })).rejects.toThrow(TRPCError);
  });
});

describe("audit.getBySlug", () => {
  it("returns audit data for a valid slug", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.audit.getBySlug({ slug: "testslug01" });
    expect(result.slug).toBe("testslug01");
    expect(result.url).toBe("https://example.com");
  });

  it("throws NOT_FOUND for unknown slug", async () => {
    const { getAuditBySlug } = await import("./db");
    vi.mocked(getAuditBySlug).mockResolvedValueOnce(undefined);
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.audit.getBySlug({ slug: "unknown" })).rejects.toThrow(TRPCError);
  });
});

describe("audit.recent", () => {
  it("returns a list of recent audits", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.audit.recent({ limit: 10 });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("slug");
    expect(result[0]).toHaveProperty("url");
    expect(result[0]).toHaveProperty("overallScore");
  });
});
