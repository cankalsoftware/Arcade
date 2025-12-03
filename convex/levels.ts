import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getLevel = query({
    args: { levelNumber: v.number() },
    handler: async (ctx, args) => {
        const level = await ctx.db
            .query("levels")
            .withIndex("by_level", (q) => q.eq("levelNumber", args.levelNumber))
            .first();
        return level;
    },
});

export const initLevels = mutation({
    args: {},
    handler: async (ctx) => {
        const levels = [];
        for (let i = 1; i <= 50; i++) {
            levels.push({
                levelNumber: i,
                config: {
                    enemySpeed: 1 + (i * 0.1),
                    enemyRows: Math.min(6, 3 + Math.floor(i / 5)),
                    enemyCols: Math.min(10, 6 + Math.floor(i / 3)),
                    fireRate: Math.max(200, 1000 - (i * 15)),
                    bunkers: Math.min(5, 2 + Math.floor(i / 10)),
                    enemyType: `enemy${((i - 1) % 10) + 1}`,
                },
            });
        }

        // Clear existing levels to update config
        const existingLevels = await ctx.db.query("levels").collect();
        for (const l of existingLevels) {
            await ctx.db.delete(l._id);
        }

        for (const level of levels) {
            await ctx.db.insert("levels", level);
        }
    },
});
