import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const submitScore = mutation({
    args: {
        score: v.number(),
        level: v.number(),
        userName: v.optional(v.string()),
        gameType: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        // Allow anonymous scores if not logged in, or require auth. 
        // For now, we'll store the token identifier if available, or "anonymous"
        const userId = identity?.tokenIdentifier ?? "anonymous";
        const userName = args.userName ?? identity?.name ?? "Anonymous";

        await ctx.db.insert("scores", {
            userId,
            userName,
            gameType: args.gameType,
            score: args.score,
            level: args.level,
            timestamp: Date.now(),
        });
    },
});

export const getTopScores = query({
    args: {
        limit: v.optional(v.number()),
        gameType: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const limit = args.limit ?? 10;

        if (args.gameType) {
            const scores = await ctx.db
                .query("scores")
                .withIndex("by_game_score", (q) => q.eq("gameType", args.gameType!))
                .order("desc")
                .take(limit);
            return scores;
        } else {
            const scores = await ctx.db
                .query("scores")
                .withIndex("by_score")
                .order("desc")
                .take(limit);
            return scores;
        }
    },
});
