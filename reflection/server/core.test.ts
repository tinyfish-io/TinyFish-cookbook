import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(userId = 1): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("Content Sources API", () => {
  it("should list user sources", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const sources = await caller.sources.list();
    
    expect(Array.isArray(sources)).toBe(true);
  });

  it("should create a new source", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sources.create({
      type: "rss",
      name: "Test RSS Feed",
      url: "https://example.com/rss",
    });

    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });

  it("should validate source URL format", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.sources.create({
        type: "rss",
        name: "Invalid Source",
        url: "not-a-url",
      })
    ).rejects.toThrow();
  });
});

describe("Content Feed API", () => {
  it("should fetch user content feed", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const feed = await caller.content.feed({
      limit: 20,
      offset: 0,
    });

    expect(Array.isArray(feed)).toBe(true);
  });

  it("should respect pagination limits", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const feed = await caller.content.feed({
      limit: 5,
      offset: 0,
    });

    expect(feed.length).toBeLessThanOrEqual(5);
  });
});

describe("User Preferences API", () => {
  it("should get user preferences", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const prefs = await caller.preferences.get();
    
    // Preferences might be null for new users
    if (prefs) {
      expect(prefs).toHaveProperty("userId");
      expect(prefs.userId).toBe(ctx.user!.id);
    }
  });

  it("should update user preferences", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.preferences.update({
      viewMode: "magazine",
      digestTime: "09:00",
      enableDigest: 1,
    });

    expect(result).toEqual({ success: true });
  });

  it("should validate digest time format", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.preferences.update({
        digestTime: "invalid-time",
      })
    ).rejects.toThrow();
  });
});

describe("Authentication", () => {
  it("should return current user info", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const user = await caller.auth.me();

    expect(user).toBeDefined();
    expect(user?.id).toBe(ctx.user!.id);
    expect(user?.email).toBe(ctx.user!.email);
  });

  it("should handle logout", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
  });
});

describe("Database Helper Functions", () => {
  it("should retrieve user sources", async () => {
    const { getUserSources } = await import("./db");
    
    // Use existing test user ID from context
    const sources = await getUserSources(1);
    
    expect(Array.isArray(sources)).toBe(true);
  });
});
