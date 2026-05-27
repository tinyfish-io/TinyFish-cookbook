/**
 * Background Jobs for Content Aggregation
 * Handles periodic content fetching, AI processing, and digest delivery
 */

import { getUserSources, createContentItem } from "./db";
import { scrapeContent } from "./scraper";
import { processContentWithAI } from "./ai";
import { addContentToFeed, queueContentSummarize } from "./redis";

/**
 * Fetch content from all active sources for a user
 */
export async function fetchUserContent(userId: number): Promise<void> {
  try {
    const sources = await getUserSources(userId);
    const activeSources = sources.filter((s) => s.enabled);

    console.log(`[Jobs] Fetching content for user ${userId} from ${activeSources.length} sources`);

    for (const source of activeSources) {
      try {
        // Scrape content from source
        const scrapedItems = await scrapeContent(source.url, source.type);

        console.log(`[Jobs] Scraped ${scrapedItems.length} items from ${source.name}`);

        // Process each item
        for (const item of scrapedItems) {
          // Check if content already exists (by URL)
          // In a production app, you'd query the database here
          
          // Process with AI
          const aiResult = await processContentWithAI(
            item.title,
            item.fullContent || item.summary || "",
            [] // TODO: Get user interests from preferences
          );

          // Save to database
          const contentId = await createContentItem({
            sourceId: source.id,
            userId,
            title: item.title,
            summary: aiResult.summary,
            fullContent: item.fullContent,
            url: item.url,
            author: item.author,
            publishedAt: item.publishedAt,
            category: aiResult.category,
            relevanceScore: aiResult.relevanceScore,
            isRead: 0,
            isSaved: 0,
          });

          // Add to Redis feed
          await addContentToFeed(
            userId,
            contentId,
            item.publishedAt.getTime(),
            86400 * 7 // 7 days TTL
          );

          console.log(`[Jobs] Processed content: ${item.title}`);
        }

        // Update source last fetched time
        const { updateSource } = await import("./db");
        await updateSource(source.id, { lastFetched: new Date() });
      } catch (error) {
        console.error(`[Jobs] Error fetching from ${source.name}:`, error);
        // Continue with next source
      }
    }

    console.log(`[Jobs] Completed content fetch for user ${userId}`);
  } catch (error) {
    console.error(`[Jobs] Error in fetchUserContent:`, error);
    throw error;
  }
}

/**
 * Fetch content for all users
 */
export async function fetchAllUsersContent(): Promise<void> {
  try {
    // Get all users with active sources
    const { getDb } = await import("./db");
    const db = await getDb();
    
    if (!db) {
      console.warn("[Jobs] Database not available");
      return;
    }

    const { users } = await import("../drizzle/schema");
    const allUsers = await db.select().from(users);

    console.log(`[Jobs] Fetching content for ${allUsers.length} users`);

    for (const user of allUsers) {
      try {
        await fetchUserContent(user.id);
      } catch (error) {
        console.error(`[Jobs] Error fetching content for user ${user.id}:`, error);
        // Continue with next user
      }
    }

    console.log("[Jobs] Completed content fetch for all users");
  } catch (error) {
    console.error("[Jobs] Error in fetchAllUsersContent:", error);
  }
}

/**
 * Generate and send daily digest for a user
 */
export async function sendDailyDigest(userId: number): Promise<void> {
  try {
    const { getUserContent, getUserPreferences } = await import("./db");
    const { notifyOwner } = await import("./_core/notification");

    // Get user preferences
    const prefs = await getUserPreferences(userId);
    
    if (!prefs || !prefs.enableDigest) {
      console.log(`[Jobs] Digest disabled for user ${userId}`);
      return;
    }

    // Get unread content from the last 24 hours
    const content = await getUserContent(userId, 10, 0);
    const unreadContent = content.filter((item) => !item.isRead);

    if (unreadContent.length === 0) {
      console.log(`[Jobs] No unread content for user ${userId}`);
      return;
    }

    // Format digest
    let digestContent = `Daily Digest - ${new Date().toLocaleDateString()}\n\n`;
    digestContent += `You have ${unreadContent.length} unread items:\n\n`;

    unreadContent.slice(0, 10).forEach((item, index) => {
      digestContent += `${index + 1}. ${item.title}\n`;
      if (item.summary) {
        digestContent += `   ${item.summary}\n`;
      }
      digestContent += `   ${item.url}\n\n`;
    });

    // Send notification (in production, this would be an email)
    await notifyOwner({
      title: `Daily Digest for User ${userId}`,
      content: digestContent,
    });

    console.log(`[Jobs] Sent daily digest to user ${userId}`);
  } catch (error) {
    console.error(`[Jobs] Error sending digest for user ${userId}:`, error);
  }
}

/**
 * Send digests to all users
 */
export async function sendAllDigests(): Promise<void> {
  try {
    const { getDb } = await import("./db");
    const db = await getDb();
    
    if (!db) {
      console.warn("[Jobs] Database not available");
      return;
    }

    const { users } = await import("../drizzle/schema");
    const allUsers = await db.select().from(users);

    console.log(`[Jobs] Sending digests to ${allUsers.length} users`);

    for (const user of allUsers) {
      try {
        await sendDailyDigest(user.id);
      } catch (error) {
        console.error(`[Jobs] Error sending digest to user ${user.id}:`, error);
      }
    }

    console.log("[Jobs] Completed sending all digests");
  } catch (error) {
    console.error("[Jobs] Error in sendAllDigests:", error);
  }
}

/**
 * Initialize background job scheduler
 * In production, use a proper job queue like BullMQ or node-cron
 */
export function initializeJobScheduler(): void {
  console.log("[Jobs] Initializing job scheduler");

  // Fetch content every 15 minutes
  setInterval(
    () => {
      console.log("[Jobs] Running scheduled content fetch");
      fetchAllUsersContent().catch((error) => {
        console.error("[Jobs] Scheduled fetch failed:", error);
      });
    },
    15 * 60 * 1000
  ); // 15 minutes

  // Send digests daily at 8 AM (simplified - in production use proper scheduling)
  setInterval(
    () => {
      const now = new Date();
      const hour = now.getHours();
      
      // Run at 8 AM
      if (hour === 8) {
        console.log("[Jobs] Running scheduled digest delivery");
        sendAllDigests().catch((error) => {
          console.error("[Jobs] Scheduled digest failed:", error);
        });
      }
    },
    60 * 60 * 1000
  ); // Check every hour

  console.log("[Jobs] Job scheduler initialized");
}
