import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listByRepository = query({
  args: {
    repositoryId: v.id("githubRepositories"),
  },
  returns: v.array(
    v.object({
      _id: v.id("repositoryOutputs"),
      _creationTime: v.number(),
      repositoryId: v.id("githubRepositories"),
      outputType: v.string(),
      enabled: v.boolean(),
      config: v.optional(v.any()),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("repositoryOutputs")
      .withIndex("by_repository", (q) =>
        q.eq("repositoryId", args.repositoryId)
      )
      .collect();
  },
});

export const get = query({
  args: {
    outputId: v.id("repositoryOutputs"),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("repositoryOutputs"),
      _creationTime: v.number(),
      repositoryId: v.id("githubRepositories"),
      outputType: v.string(),
      enabled: v.boolean(),
      config: v.optional(v.any()),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.outputId);
  },
});

export const update = mutation({
  args: {
    outputId: v.id("repositoryOutputs"),
    enabled: v.optional(v.boolean()),
    config: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const output = await ctx.db.get(args.outputId);
    if (!output) {
      throw new Error("Output not found");
    }

    const updates: Partial<{
      enabled: boolean;
      config: unknown;
    }> = {};

    if (args.enabled !== undefined) {
      updates.enabled = args.enabled;
    }
    if (args.config !== undefined) {
      updates.config = args.config;
    }

    await ctx.db.patch(args.outputId, updates);
    return null;
  },
});

export const toggle = mutation({
  args: {
    outputId: v.id("repositoryOutputs"),
    enabled: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const output = await ctx.db.get(args.outputId);
    if (!output) {
      throw new Error("Output not found");
    }

    await ctx.db.patch(args.outputId, {
      enabled: args.enabled,
    });
    return null;
  },
});

export const upsert = mutation({
  args: {
    repositoryId: v.id("githubRepositories"),
    outputType: v.string(),
    enabled: v.boolean(),
    config: v.optional(v.any()),
  },
  returns: v.id("repositoryOutputs"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("repositoryOutputs")
      .withIndex("by_repository_type", (q) =>
        q
          .eq("repositoryId", args.repositoryId)
          .eq("outputType", args.outputType)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: args.enabled,
        config: args.config,
      });
      return existing._id;
    }

    return await ctx.db.insert("repositoryOutputs", {
      repositoryId: args.repositoryId,
      outputType: args.outputType,
      enabled: args.enabled,
      config: args.config,
    });
  },
});
