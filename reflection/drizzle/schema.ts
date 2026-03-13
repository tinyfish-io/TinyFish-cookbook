import { int, mysqlEnum, mysqlTable, text, timestamp, tinyint, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Content sources that users follow (RSS feeds, blogs, news sites)
 */
export const contentSources = mysqlTable("content_sources", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: mysqlEnum("type", ["rss", "blog", "newsletter", "news", "linkedin", "x", "podcast"]).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  url: text("url").notNull(),
  enabled: tinyint("enabled").default(1).notNull(),
  lastFetched: timestamp("last_fetched"),
  fetchFrequency: int("fetch_frequency").default(15).notNull(), // minutes
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type ContentSource = typeof contentSources.$inferSelect;
export type InsertContentSource = typeof contentSources.$inferInsert;

/**
 * Individual content items (articles, posts) fetched from sources
 */
export const contentItems = mysqlTable("content_items", {
  id: int("id").autoincrement().primaryKey(),
  sourceId: int("source_id").notNull().references(() => contentSources.id, { onDelete: "cascade" }),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  summary: text("summary"),
  fullContent: text("full_content"),
  url: text("url").notNull(),
  author: varchar("author", { length: 255 }),
  publishedAt: timestamp("published_at").notNull(),
  category: varchar("category", { length: 100 }),
  relevanceScore: int("relevance_score").default(50), // 0-100
  isRead: tinyint("is_read").default(0).notNull(),
  isSaved: tinyint("is_saved").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ContentItem = typeof contentItems.$inferSelect;
export type InsertContentItem = typeof contentItems.$inferInsert;

/**
 * User preferences for content aggregation
 */
export const userPreferences = mysqlTable("user_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  digestTime: varchar("digest_time", { length: 5 }).default("08:00"), // HH:MM format
  viewMode: mysqlEnum("view_mode", ["inbox", "magazine", "cards"]).default("inbox").notNull(),
  enableDigest: tinyint("enable_digest").default(1).notNull(),
  categoriesFilter: text("categories_filter"), // JSON array of enabled categories
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type UserPreference = typeof userPreferences.$inferSelect;
export type InsertUserPreference = typeof userPreferences.$inferInsert;