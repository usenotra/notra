import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    emailVerified: v.boolean(),
    image: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    twoFactorEnabled: v.optional(v.boolean()),
    isAnonymous: v.optional(v.boolean()),
    username: v.optional(v.string()),
    displayUsername: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    phoneNumberVerified: v.optional(v.boolean()),
    userId: v.optional(v.string()),
  }).index("by_email", ["email"]),

  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    logo: v.optional(v.string()),
    metadata: v.optional(v.string()),
    createdAt: v.number(),
    websiteUrl: v.optional(v.string()),
  }).index("by_slug", ["slug"]),

  members: defineTable({
    organizationId: v.string(),
    userId: v.string(),
    role: v.string(),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_user", ["userId"])
    .index("by_user_org", ["userId", "organizationId"]),

  invitations: defineTable({
    organizationId: v.string(),
    email: v.string(),
    role: v.string(),
    status: v.string(),
    expiresAt: v.number(),
    inviterId: v.string(),
  }).index("by_organization", ["organizationId"]),

  // GitHub Integrations
  githubIntegrations: defineTable({
    organizationId: v.string(),
    createdByUserId: v.string(),
    displayName: v.string(),
    encryptedToken: v.optional(v.string()),
    enabled: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_created_by", ["createdByUserId"]),

  // GitHub Repositories
  githubRepositories: defineTable({
    integrationId: v.id("githubIntegrations"),
    owner: v.string(),
    repo: v.string(),
    enabled: v.boolean(),
  })
    .index("by_integration", ["integrationId"])
    .index("by_integration_owner_repo", ["integrationId", "owner", "repo"]),

  // Repository Outputs
  repositoryOutputs: defineTable({
    repositoryId: v.id("githubRepositories"),
    outputType: v.string(),
    enabled: v.boolean(),
    config: v.optional(v.any()),
  })
    .index("by_repository", ["repositoryId"])
    .index("by_repository_type", ["repositoryId", "outputType"]),

  // Brand Settings
  brandSettings: defineTable({
    organizationId: v.string(),
    companyName: v.optional(v.string()),
    companyDescription: v.optional(v.string()),
    toneProfile: v.optional(v.string()),
    customTone: v.optional(v.string()),
    customInstructions: v.optional(v.string()),
    audience: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_organization", ["organizationId"]),

  // Posts
  posts: defineTable({
    organizationId: v.string(),
    title: v.string(),
    content: v.string(),
    markdown: v.string(),
    contentType: v.string(),
    updatedAt: v.number(),
  }).index("by_organization", ["organizationId"]),

  // Webhook Logs
  webhookLogs: defineTable({
    organizationId: v.string(),
    status: v.number(),
    method: v.string(),
    path: v.string(),
    payload: v.optional(v.any()),
    response: v.optional(v.any()),
  }).index("by_organization", ["organizationId"]),

  // Brand Analysis Progress (for tracking async analysis)
  brandAnalysisProgress: defineTable({
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
  }).index("by_organization", ["organizationId"]),
});
