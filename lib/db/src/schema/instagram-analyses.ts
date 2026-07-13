import {
  pgTable,
  serial,
  text,
  integer,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const instagramAnalysesTable = pgTable("instagram_analyses", {
  id: serial("id").primaryKey(),
  input: text("input").notNull(),
  username: text("username").notNull(),
  fullName: text("full_name").notNull(),
  profilePicUrl: text("profile_pic_url").notNull(),
  followerCount: integer("follower_count").notNull(),
  postCount: integer("post_count").notNull(),
  profile: jsonb("profile").notNull(),
  posts: jsonb("posts").notNull(),
  aggregates: jsonb("aggregates").notNull(),
  insights: jsonb("insights").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertInstagramAnalysisSchema = createInsertSchema(
  instagramAnalysesTable,
).omit({ id: true, createdAt: true });
export type InsertInstagramAnalysis = z.infer<typeof insertInstagramAnalysisSchema>;
export type InstagramAnalysisRow = typeof instagramAnalysesTable.$inferSelect;
