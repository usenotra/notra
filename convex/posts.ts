import { paginationOptsValidator } from "convex/server";
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

export const list = query({
  args: {
    organizationId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await verifyOrgAccess(ctx, user._id, args.organizationId);

    return await ctx.db
      .query("posts")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const get = query({
  args: {
    postId: v.id("posts"),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("posts"),
      _creationTime: v.number(),
      organizationId: v.string(),
      title: v.string(),
      content: v.string(),
      markdown: v.string(),
      contentType: v.string(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    const post = await ctx.db.get(args.postId);
    if (!post) {
      return null;
    }

    await verifyOrgAccess(ctx, user._id, post.organizationId);

    return post;
  },
});

export const getByOrganization = query({
  args: {
    organizationId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("posts"),
      _creationTime: v.number(),
      organizationId: v.string(),
      title: v.string(),
      content: v.string(),
      markdown: v.string(),
      contentType: v.string(),
      updatedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await verifyOrgAccess(ctx, user._id, args.organizationId);
  handler: async (ctx, args) => {
    const q = ctx.db
      .query("posts")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc");

    // Always enforce a reasonable maximum limit to prevent unbounded collection
    const MAX_LIMIT = 100;
    const limit = args.limit ?? MAX_LIMIT;
    return await q.take(limit);
  },
});

export const create = mutation({
  args: {
    organizationId: v.string(),
    title: v.string(),
    content: v.string(),
    markdown: v.string(),
    contentType: v.string(),
  },
  returns: v.id("posts"),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await verifyOrgAccess(ctx, user._id, args.organizationId);

    return await ctx.db.insert("posts", {
      organizationId: args.organizationId,
      title: args.title,
      content: args.content,
      markdown: args.markdown,
      contentType: args.contentType,
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    postId: v.id("posts"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    markdown: v.optional(v.string()),
    contentType: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    await verifyOrgAccess(ctx, user._id, post.organizationId);

    const updates: Partial<{
      title: string;
      content: string;
      markdown: string;
      contentType: string;
      updatedAt: number;
    }> = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) {
      updates.title = args.title;
    }
    if (args.content !== undefined) {
      updates.content = args.content;
    }
    if (args.markdown !== undefined) {
      updates.markdown = args.markdown;
    }
    if (args.contentType !== undefined) {
      updates.contentType = args.contentType;
    }

    await ctx.db.patch(args.postId, updates);
    return null;
  },
});

export const remove = mutation({
  args: {
    postId: v.id("posts"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    await verifyOrgAccess(ctx, user._id, post.organizationId);

    await ctx.db.delete(args.postId);
    return null;
  },
});
