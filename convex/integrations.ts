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

export const list = query({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const integrations = await ctx.db
      .query("githubIntegrations")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    const users = await ctx.db.query("users").collect();

    const integrationsWithRepos = await Promise.all(
      integrations.map(async (integration) => {
        const repositories = await ctx.db
          .query("githubRepositories")
          .withIndex("by_integration", (q) =>
            q.eq("integrationId", integration._id)
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

        const createdByUser = users.find(
          (u) => u._id === integration.createdByUserId
        );

        return {
          ...integration,
          createdAt: new Date(integration._creationTime).toISOString(),
          createdByUser: createdByUser
            ? {
                id: createdByUser._id,
                name: createdByUser.name,
                email: createdByUser.email,
                image: createdByUser.image ?? null,
              }
            : undefined,
          repositories: reposWithOutputs,
        };
      })
    );

    return {
      integrations: integrationsWithRepos,
      count: integrationsWithRepos.length,
    };
  },
});

export const get = query({
  args: {
    integrationId: v.id("githubIntegrations"),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId);
    if (!integration) {
      return null;
    }

    const repositories = await ctx.db
      .query("githubRepositories")
      .withIndex("by_integration", (q) =>
        q.eq("integrationId", integration._id)
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

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("_id"), integration.createdByUserId))
      .first();

    return {
      ...integration,
      createdAt: new Date(integration._creationTime).toISOString(),
      createdByUser: user
        ? {
            id: user._id,
            name: user.name,
            email: user.email,
            image: user.image ?? null,
          }
        : undefined,
      repositories: reposWithOutputs,
    };
  },
});

export const create = mutation({
  args: {
    organizationId: v.string(),
    owner: v.string(),
    repo: v.string(),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    const displayName = `${args.owner}/${args.repo}`;

    const integrationId = await ctx.db.insert("githubIntegrations", {
      organizationId: args.organizationId,
      createdByUserId: user._id,
      displayName,
      encryptedToken: args.token,
      enabled: true,
      updatedAt: Date.now(),
    });

    const repositoryId = await ctx.db.insert("githubRepositories", {
      integrationId,
      owner: args.owner,
      repo: args.repo,
      enabled: true,
    });

    await ctx.db.insert("repositoryOutputs", {
      repositoryId,
      outputType: "changelog",
      enabled: true,
      config: undefined,
    });

    await ctx.db.insert("repositoryOutputs", {
      repositoryId,
      outputType: "blog_post",
      enabled: false,
      config: undefined,
    });

    await ctx.db.insert("repositoryOutputs", {
      repositoryId,
      outputType: "twitter_post",
      enabled: false,
      config: undefined,
    });

    return integrationId;
  },
});

export const update = mutation({
  args: {
    integrationId: v.id("githubIntegrations"),
    enabled: v.optional(v.boolean()),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId);
    if (!integration) {
      throw new Error("Integration not found");
    }

    const updates: Partial<{
      enabled: boolean;
      displayName: string;
      updatedAt: number;
    }> = {
      updatedAt: Date.now(),
    };

    if (args.enabled !== undefined) {
      updates.enabled = args.enabled;
    }
    if (args.displayName !== undefined) {
      updates.displayName = args.displayName;
    }

    await ctx.db.patch(args.integrationId, updates);
    return null;
  },
});

export const remove = mutation({
  args: {
    integrationId: v.id("githubIntegrations"),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId);
    if (!integration) {
      throw new Error("Integration not found");
    }

    const repositories = await ctx.db
      .query("githubRepositories")
      .withIndex("by_integration", (q) =>
        q.eq("integrationId", args.integrationId)
      )
      .collect();

    for (const repo of repositories) {
      const outputs = await ctx.db
        .query("repositoryOutputs")
        .withIndex("by_repository", (q) => q.eq("repositoryId", repo._id))
        .collect();

      for (const output of outputs) {
        await ctx.db.delete(output._id);
      }

      await ctx.db.delete(repo._id);
    }

    await ctx.db.delete(args.integrationId);
    return null;
  },
});

export const getIntegrationToken = query({
  args: {
    integrationId: v.id("githubIntegrations"),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId);
    if (!integration) {
      return null;
    }
    return integration.encryptedToken ?? null;
  },
});

export const listAvailableRepos = query({
  args: {
    integrationId: v.id("githubIntegrations"),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId);
    if (!integration?.encryptedToken) {
      return [];
    }
    return [];
  },
});
