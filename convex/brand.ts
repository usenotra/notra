import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

async function getAuthenticatedUser(ctx: { auth: unknown }) {
  const user = await authComponent.getAuthUser(
    ctx as Parameters<typeof authComponent.getAuthUser>[0]
  );
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user;
}

async function verifyOrgAccess(
  ctx: { db: unknown },
  userId: string,
  organizationId: string
) {
  const db = ctx.db as {
    query: (table: "members") => {
      withIndex: (
        index: string,
        fn: (q: {
          eq: (
            field: string,
            value: string
          ) => { eq: (field: string, value: string) => unknown };
        }) => unknown
      ) => { first: () => Promise<{ _id: string; role: string } | null> };
    };
  };
  const membership = await db
    .query("members")
    .withIndex("by_user_org", (q) =>
      q.eq("userId", userId).eq("organizationId", organizationId)
    )
    .first();
  if (!membership) {
    throw new Error("You do not have access to this organization");
  }
  return membership;
}

export const get = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("brandSettings"),
      _creationTime: v.number(),
      organizationId: v.string(),
      companyName: v.optional(v.string()),
      companyDescription: v.optional(v.string()),
      toneProfile: v.optional(v.string()),
      customTone: v.optional(v.string()),
      customInstructions: v.optional(v.string()),
      audience: v.optional(v.string()),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await verifyOrgAccess(ctx, user._id, args.organizationId);

    return await ctx.db
      .query("brandSettings")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();
  },
});

export const getProgress = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("brandAnalysisProgress"),
      _creationTime: v.number(),
      organizationId: v.string(),
      status: v.union(
        v.literal("idle"),
        v.literal("analyzing"),
        v.literal("completed"),
        v.literal("failed")
      ),
      progress: v.optional(v.number()),
      error: v.optional(v.string()),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await verifyOrgAccess(ctx, user._id, args.organizationId);

    return await ctx.db
      .query("brandAnalysisProgress")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();
  },
});

export const upsert = mutation({
  args: {
    organizationId: v.string(),
    companyName: v.optional(v.string()),
    companyDescription: v.optional(v.string()),
    toneProfile: v.optional(v.string()),
    customTone: v.optional(v.string()),
    customInstructions: v.optional(v.string()),
    audience: v.optional(v.string()),
  },
  returns: v.id("brandSettings"),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await verifyOrgAccess(ctx, user._id, args.organizationId);

    const existing = await ctx.db
      .query("brandSettings")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    const data = {
      organizationId: args.organizationId,
      companyName: args.companyName,
      companyDescription: args.companyDescription,
      toneProfile: args.toneProfile,
      customTone: args.customTone,
      customInstructions: args.customInstructions,
      audience: args.audience,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    }

    return await ctx.db.insert("brandSettings", data);
  return await ctx.db.insert("brandSettings", data);

  },

});

// Internal mutation for workflow system - no auth check needed as this is called
// from server-side workflow handlers that don't have user context
export const setProgress = internalMutation({
  args: {
    organizationId: v.string(),
    status: v.union(
      v.literal("idle"),
      v.literal("analyzing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    progress: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  returns: v.id("brandAnalysisProgress"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("brandAnalysisProgress")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    const data = {
      organizationId: args.organizationId,
      status: args.status,
      progress: args.progress,
      error: args.error,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    }

    return await ctx.db.insert("brandAnalysisProgress", data);
  },
});
