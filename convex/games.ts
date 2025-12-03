import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const saveGame = mutation({
    args: {
        level: v.number(),
        score: v.number(),
        lives: v.number(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return; // Only authenticated users can save

        const userId = identity.tokenIdentifier;
        const existing = await ctx.db
            .query("saved_games")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                level: args.level,
                score: args.score,
                lives: args.lives,
                timestamp: Date.now(),
            });
        } else {
            await ctx.db.insert("saved_games", {
                userId,
                level: args.level,
                score: args.score,
                lives: args.lives,
                timestamp: Date.now(),
            });
        }
    },
});

export const loadGame = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        const userId = identity.tokenIdentifier;
        return await ctx.db
            .query("saved_games")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();
    },
});

export const clearSave = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return;

        const userId = identity.tokenIdentifier;
        const existing = await ctx.db
            .query("saved_games")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();

        if (existing) {
            await ctx.db.delete(existing._id);
        }
    },
});
