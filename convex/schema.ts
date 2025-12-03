import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  scores: defineTable({
    userId: v.string(),
    userName: v.optional(v.string()),
    gameType: v.optional(v.string()),
    score: v.number(),
    level: v.number(),
    timestamp: v.number(),
  }).index("by_score", ["score"]).index("by_game_score", ["gameType", "score"]),

  levels: defineTable({
    levelNumber: v.number(),
    config: v.object({
      enemySpeed: v.number(),
      enemyRows: v.number(),
      enemyCols: v.number(),
      fireRate: v.number(),
      bunkers: v.optional(v.number()),
      enemyType: v.optional(v.string()),
    }),
  }).index("by_level", ["levelNumber"]),

  saved_games: defineTable({
    userId: v.string(),
    level: v.number(),
    score: v.number(),
    lives: v.number(),
    timestamp: v.number(),
  }).index("by_user", ["userId"]),
});
