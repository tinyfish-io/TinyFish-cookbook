import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Content Sources
 */
export async function getUserSources(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const { contentSources } = await import("../drizzle/schema");
  return await db.select().from(contentSources).where(eq(contentSources.userId, userId));
}

export async function createSource(source: InsertContentSource) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { contentSources } = await import("../drizzle/schema");
  const result = await db.insert(contentSources).values(source);
  return Number(result[0].insertId);
}

export async function updateSource(sourceId: number, updates: Partial<InsertContentSource>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { contentSources } = await import("../drizzle/schema");
  await db.update(contentSources).set(updates).where(eq(contentSources.id, sourceId));
}

export async function deleteSource(sourceId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { contentSources } = await import("../drizzle/schema");
  await db.delete(contentSources).where(eq(contentSources.id, sourceId));
}

/**
 * Content Items
 */
export async function getUserContent(userId: number, limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  
  const { contentItems } = await import("../drizzle/schema");
  const { desc } = await import("drizzle-orm");
  
  return await db
    .select()
    .from(contentItems)
    .where(eq(contentItems.userId, userId))
    .orderBy(desc(contentItems.publishedAt))
    .limit(limit)
    .offset(offset);
}

export async function createContentItem(item: InsertContentItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { contentItems } = await import("../drizzle/schema");
  const result = await db.insert(contentItems).values(item);
  return Number(result[0].insertId);
}

export async function markContentAsRead(contentId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { contentItems } = await import("../drizzle/schema");
  const { and } = await import("drizzle-orm");
  
  await db
    .update(contentItems)
    .set({ isRead: 1 })
    .where(and(eq(contentItems.id, contentId), eq(contentItems.userId, userId)));
}

export async function saveContent(contentId: number, userId: number, saved: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { contentItems } = await import("../drizzle/schema");
  const { and } = await import("drizzle-orm");
  
  await db
    .update(contentItems)
    .set({ isSaved: saved ? 1 : 0 })
    .where(and(eq(contentItems.id, contentId), eq(contentItems.userId, userId)));
}

/**
 * User Preferences
 */
export async function getUserPreferences(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const { userPreferences } = await import("../drizzle/schema");
  const results = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
  return results.length > 0 ? results[0] : null;
}

export async function upsertUserPreferences(userId: number, prefs: Partial<InsertUserPreference>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { userPreferences } = await import("../drizzle/schema");
  
  await db
    .insert(userPreferences)
    .values({ userId, ...prefs })
    .onDuplicateKeyUpdate({
      set: prefs,
    });
}

// Import types for use in this file
import type { InsertContentSource, InsertContentItem, InsertUserPreference } from "../drizzle/schema";
