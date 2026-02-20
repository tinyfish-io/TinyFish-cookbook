import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  
  // AI Chat
  ai: router({
    chat: publicProcedure
      .input(z.object({ message: z.string() }))
      .mutation(async ({ input }) => {
        const message = input.message.toLowerCase();
        
        // Simple intent detection
        if (message.includes('summary') || message.includes('today') || message.includes('latest')) {
          return {
            message: "Here's your content summary for today! I've found 10 new articles from your sources including updates from Sam Altman, Elon Musk, and more. Redirecting you to your feed now..."
          };
        }
        
        if (message.includes('sam altman') || message.includes('openai')) {
          return {
            message: "I found 2 recent posts from Sam Altman about OpenAI's latest reasoning model breakthrough and the 10-year anniversary. Check your feed for details!"
          };
        }
        
        if (message.includes('tech') || message.includes('technology')) {
          return {
            message: "You have 7 tech updates including OpenAI breakthroughs, Starship launches, Tesla FSD expansion, and GitHub Copilot milestones. Opening your feed..."
          };
        }
        
        if (message.includes('business')) {
          return {
            message: "Found 3 business insights from Paul Graham and Satya Nadella about startup advice, hybrid work, and YC Demo Day highlights. Let me show you!"
          };
        }
        
        return {
          message: "I can help you explore your content! Try asking for 'summary for today', 'latest tech updates', or mention specific people like 'Sam Altman' or 'Elon Musk'."
        };
      }),
  }),
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  //   // Content Sources
  sources: router({
    list: publicProcedure.query(async () => {
      const { getUserSources } = await import("./db");
      // Use default user ID of 1 for public app
      return await getUserSources(1);
    }),
    
    create: publicProcedure
      .input(z.object({
        type: z.enum(["rss", "blog", "newsletter", "news", "linkedin", "x", "podcast"]),
        name: z.string().min(1).max(255),
        url: z.string().url(),
      }))
      .mutation(async ({ input }) => {
        const { createSource } = await import("./db");
        // Use a default user ID of 1 for public app
        const sourceId = await createSource({
          userId: 1,
          ...input,
        });
        return { id: sourceId };
      }),
    
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        enabled: z.number().min(0).max(1).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { updateSource } = await import("./db");
        const { id, ...updates } = input;
        await updateSource(id, updates);
        return { success: true };
      }),
    
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { deleteSource } = await import("./db");
        await deleteSource(input.id);
        return { success: true };
      }),
  }),
  
  // Content Feed
  content: router({
    feed: publicProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ ctx, input }) => {
        const { getUserContent, getDb } = await import("./db");
        
        // If authenticated, show user's content
        if (ctx.user) {
          return await getUserContent(ctx.user.id, input.limit, input.offset);
        }
        
        // If not authenticated, show public/demo content (empty for now)
        // In production, you might want to show curated public content
        return [];
      }),
    
    markRead: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { markContentAsRead } = await import("./db");
        const { markAsRead } = await import("./redis");
        
        // Use default user ID of 1 for public app
        await markContentAsRead(input.id, 1);
        await markAsRead(1, input.id);
        
        return { success: true };
      }),
    
    save: publicProcedure
      .input(z.object({ id: z.number(), saved: z.boolean() }))
      .mutation(async ({ input }) => {
        const { saveContent } = await import("./db");
        // Use default user ID of 1 for public app
        await saveContent(input.id, 1, input.saved);
        return { success: true };
      }),
  }),
  
  // Background Jobs
  jobs: router({
    fetchContent: publicProcedure.mutation(async () => {
      const { fetchUserContent } = await import("./jobs");
      // Use default user ID of 1 for public app
      await fetchUserContent(1);
      return { success: true };
    }),
  }),
  
  // User Preferences
  preferences: router({
    get: publicProcedure.query(async () => {
      const { getUserPreferences } = await import("./db");
      // Use default user ID of 1 for public app
      return await getUserPreferences(1);
    }),
    
    update: publicProcedure
      .input(z.object({
        digestTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        viewMode: z.enum(["inbox", "magazine", "cards"]).optional(),
        enableDigest: z.number().min(0).max(1).optional(),
      }))
      .mutation(async ({ input }) => {
        const { upsertUserPreferences } = await import("./db");
        // Use default user ID of 1 for public app
        await upsertUserPreferences(1, input);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
