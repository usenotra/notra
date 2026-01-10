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

export const listByIntegration = query({
  args: {
    integrationId: v.id("githubIntegrations"),
  },
  returns: v.array(
    v.object({
      _id: v.id("githubRepositories"),
      _creationTime: v.number(),
      integrationId: v.id("githubIntegrations"),
      owner: v.string(),
      repo: v.string(),
      enabled: v.boolean(),
      outputs: v.array(
        v.object({
          _id: v.id("repositoryOutputs"),
          _creationTime: v.number(),
          repositoryId: v.id("githubRepositories"),
          outputType: v.string(),
          enabled: v.boolean(),
          config: v.optional(v.any()),
        })
      ),
    })
  ),
  handler: async (ctx, args) => {
    const repositories = await ctx.db
      .query("githubRepositories")
      .withIndex("by_integration", (q) =>
        q.eq("integrationId", args.integrationId)
      )
      .collect();

    const reposWithOutputs = await Promise.all(
      repositories.map(async (repo) => {
        const outputs = await ctx.db
          .query("repositoryOutputs")
          .withIndex("by_repository", (q) => q.eq("repositoryId", repo._id))
          .collect();

        return {
          ...repo,
          outputs,
        };
      })
    );

    return reposWithOutputs;
  },
});

export const get = query({
  args: {
    repositoryId: v.id("githubRepositories"),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("githubRepositories"),
      _creationTime: v.number(),
      integrationId: v.id("githubIntegrations"),
      owner: v.string(),
      repo: v.string(),
      enabled: v.boolean(),
      outputs: v.array(
        v.object({
          _id: v.id("repositoryOutputs"),
          _creationTime: v.number(),
          repositoryId: v.id("githubRepositories"),
          outputType: v.string(),
          enabled: v.boolean(),
          config: v.optional(v.any()),
        })
      ),
    })
  ),
  handler: async (ctx, args) => {
    const repo = await ctx.db.get(args.repositoryId);
    if (!repo) {
      return null;
    }

    const outputs = await ctx.db
      .query("repositoryOutputs")
      .withIndex("by_repository", (q) => q.eq("repositoryId", repo._id))
      .collect();

    return {
      ...repo,
      outputs,
    };
  },
});

export const add = mutation({
  args: {
    integrationId: v.id("githubIntegrations"),
    owner: v.string(),
    repo: v.string(),
    outputs: v.optional(
      v.array(
        v.object({
          type: v.string(),
          enabled: v.optional(v.boolean()),
          config: v.optional(v.any()),
        })
      )
    ),
  },
  returns: v.id("githubRepositories"),
  handler: async (ctx, args) => {
    await getAuthenticatedUser(ctx);

    const integration = await ctx.db.get(args.integrationId);
    if (!integration) {
      throw new Error("Integration not found");
    }

    const repositoryId = await ctx.db.insert("githubRepositories", {
      integrationId: args.integrationId,
      owner: args.owner,
      repo: args.repo,
      enabled: true,
    });

    const outputs = args.outputs ?? [
      { type: "changelog", enabled: true },
      { type: "blog_post", enabled: false },
      { type: "twitter_post", enabled: false },
    ];

    for (const output of outputs) {
      await ctx.db.insert("repositoryOutputs", {
        repositoryId,
        outputType: output.type,
        enabled: output.enabled ?? true,
        config: output.config,
      });
    }

    return repositoryId;
  },
});

export const update = mutation({
  args: {
    repositoryId: v.id("githubRepositories"),
    enabled: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const repo = await ctx.db.get(args.repositoryId);
    if (!repo) {
      throw new Error("Repository not found");
    }

    if (args.enabled !== undefined) {
      await ctx.db.patch(args.repositoryId, {
        enabled: args.enabled,
      });
    }

    return null;
  },
});

export const remove = mutation({
  args: {
    repositoryId: v.id("githubRepositories"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const repo = await ctx.db.get(args.repositoryId);
    if (!repo) {
      throw new Error("Repository not found");
    }

    const outputs = await ctx.db
      .query("repositoryOutputs")
      .withIndex("by_repository", (q) =>
        q.eq("repositoryId", args.repositoryId)
      )
      .collect();

    for (const output of outputs) {
      await ctx.db.delete(output._id);
    }

    await ctx.db.delete(args.repositoryId);
    return null;
  },
});

export const getByOwnerRepo = query({
  args: {
    owner: v.string(),
    repo: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("githubRepositories"),
      owner: v.string(),
      repo: v.string(),
      enabled: v.boolean(),
      encryptedToken: v.optional(v.string()),
      integrationEnabled: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const repositories = await ctx.db.query("githubRepositories").collect();

    const repository = repositories.find(
      (r) => r.owner === args.owner && r.repo === args.repo
    );

    if (!repository) {
      return null;
    }

    const integration = await ctx.db.get(repository.integrationId);

    return {
      _id: repository._id,
      owner: repository.owner,
      repo: repository.repo,
      enabled: repository.enabled,
      encryptedToken: integration?.encryptedToken,
      integrationEnabled: integration?.enabled ?? false,
    };
  },
});
