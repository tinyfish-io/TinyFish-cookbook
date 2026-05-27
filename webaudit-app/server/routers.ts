import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";
import { nanoid } from "nanoid";
import {
  createAudit,
  getAuditById,
  getAuditBySlug,
  getRecentAudits,
  updateAudit,
  countRecentAuditsByIp,
} from "./db";
import { runAudit } from "./auditRunner";

// ── Helpers ───────────────────────────────────────────────────────────────────

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip + "webaudit-salt").digest("hex").substring(0, 32);
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return "https://" + trimmed;
  }
  return trimmed;
}

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// In-memory set to track running audits (prevents duplicate concurrent runs)
const runningAudits = new Set<number>();

// ── Audit Router ──────────────────────────────────────────────────────────────

const auditRouter = router({
  start: publicProcedure
    .input(z.object({ url: z.string().min(1).max(2048) }))
    .mutation(async ({ input, ctx }) => {
      const url = normalizeUrl(input.url);

      if (!isValidUrl(url)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid URL. Please enter a valid website address." });
      }

      // Block localhost and private IPs
      const hostname = new URL(url).hostname;
      if (
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname.startsWith("192.168.") ||
        hostname.startsWith("10.") ||
        hostname.endsWith(".local")
      ) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Auditing private or local addresses is not allowed." });
      }

      // Rate limiting: max 5 audits per IP per hour
      const rawIp = (ctx.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || ctx.req.socket?.remoteAddress || "unknown";
      const ipHash = hashIp(rawIp);
      const recentCount = await countRecentAuditsByIp(ipHash, 60 * 60 * 1000);
      if (recentCount >= 5) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Rate limit reached. You can run up to 5 audits per hour. Please try again later.",
        });
      }

      const slug = nanoid(10);
      const auditId = await createAudit({ url, slug, status: "pending", ipHash });

      // Run audit asynchronously
      if (!runningAudits.has(auditId)) {
        runningAudits.add(auditId);
        (async () => {
          try {
            await updateAudit(auditId, { status: "running" });
            const results = await runAudit(url, 90000);
            await updateAudit(auditId, {
              status: "completed",
              overallScore: results.overallScore,
              results: results as any,
              completedAt: new Date(),
            });
          } catch (err: any) {
            console.error(`[Audit ${auditId}] Failed:`, err.message);
            await updateAudit(auditId, {
              status: "failed",
              errorMessage: err.message || "Audit failed unexpectedly.",
              completedAt: new Date(),
            });
          } finally {
            runningAudits.delete(auditId);
          }
        })();
      }

      return { auditId, slug };
    }),

  status: publicProcedure
    .input(z.object({ auditId: z.number() }))
    .query(async ({ input }) => {
      const audit = await getAuditById(input.auditId);
      if (!audit) throw new TRPCError({ code: "NOT_FOUND", message: "Audit not found." });

      return {
        id: audit.id,
        slug: audit.slug,
        url: audit.url,
        status: audit.status,
        overallScore: audit.overallScore,
        results: audit.results as any,
        errorMessage: audit.errorMessage,
        createdAt: audit.createdAt,
        completedAt: audit.completedAt,
      };
    }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const audit = await getAuditBySlug(input.slug);
      if (!audit) throw new TRPCError({ code: "NOT_FOUND", message: "Audit not found." });

      return {
        id: audit.id,
        slug: audit.slug,
        url: audit.url,
        status: audit.status,
        overallScore: audit.overallScore,
        results: audit.results as any,
        errorMessage: audit.errorMessage,
        createdAt: audit.createdAt,
        completedAt: audit.completedAt,
      };
    }),

  recent: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }).optional())
    .query(async ({ input }) => {
      const audits = await getRecentAudits(input?.limit ?? 20);
      return audits.map((a) => ({
        id: a.id,
        slug: a.slug,
        url: a.url,
        overallScore: a.overallScore,
        createdAt: a.createdAt,
        completedAt: a.completedAt,
      }));
    }),
});

// ── App Router ────────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  audit: auditRouter,
});

export type AppRouter = typeof appRouter;
