import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    activeOrganizationId: text("active_organization_id"),
  },
  (table) => [index("sessions_userId_idx").on(table.userId)]
);

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("accounts_userId_idx").on(table.userId)]
);

export const verifications = pgTable(
  "verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier)]
);

export const organizations = pgTable(
  "organizations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    logo: text("logo"),
    websiteUrl: text("website_url"),
    createdAt: timestamp("created_at").notNull(),
    metadata: text("metadata"),
  },
  (table) => [uniqueIndex("organizations_slug_uidx").on(table.slug)]
);

export const members = pgTable(
  "members",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").default("member").notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [
    index("members_organizationId_idx").on(table.organizationId),
    index("members_userId_idx").on(table.userId),
  ]
);

export const invitations = pgTable(
  "invitations",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role"),
    status: text("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("invitations_organizationId_idx").on(table.organizationId),
    index("invitations_email_idx").on(table.email),
  ]
);

export const githubIntegrations = pgTable(
  "github_integrations",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    encryptedToken: text("encrypted_token"),
    enabled: boolean("enabled").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("githubIntegrations_organizationId_idx").on(table.organizationId),
    index("githubIntegrations_createdByUserId_idx").on(table.createdByUserId),
  ]
);

export const githubRepositories = pgTable(
  "github_repositories",
  {
    id: text("id").primaryKey(),
    integrationId: text("integration_id")
      .notNull()
      .references(() => githubIntegrations.id, { onDelete: "cascade" }),
    owner: text("owner").notNull(),
    repo: text("repo").notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    encryptedWebhookSecret: text("encrypted_webhook_secret"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("githubRepositories_integrationId_idx").on(table.integrationId),
    uniqueIndex("githubRepositories_integration_owner_repo_uidx").on(
      table.integrationId,
      table.owner,
      table.repo
    ),
  ]
);

export const repositoryOutputs = pgTable(
  "repository_outputs",
  {
    id: text("id").primaryKey(),
    repositoryId: text("repository_id")
      .notNull()
      .references(() => githubRepositories.id, { onDelete: "cascade" }),
    outputType: text("output_type").notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    config: jsonb("config"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("repositoryOutputs_repositoryId_idx").on(table.repositoryId),
    uniqueIndex("repositoryOutputs_repository_outputType_uidx").on(
      table.repositoryId,
      table.outputType
    ),
  ]
);

export const brandSettings = pgTable(
  "brand_settings",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    companyName: text("company_name"),
    companyDescription: text("company_description"),
    toneProfile: text("tone_profile"),
    customTone: text("custom_tone"),
    customInstructions: text("custom_instructions"),
    audience: text("audience"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("brandSettings_organizationId_uidx").on(table.organizationId),
  ]
);

export const posts = pgTable(
  "posts",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    markdown: text("markdown").notNull(),
    contentType: text("content_type").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("posts_org_createdAt_id_idx").on(
      table.organizationId,
      table.createdAt,
      table.id
    ),
  ]
);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  members: many(members),
  invitations: many(invitations),
  githubIntegrations: many(githubIntegrations),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  users: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  users: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const organizationsRelations = relations(
  organizations,
  ({ many, one }) => ({
    members: many(members),
    invitations: many(invitations),
    githubIntegrations: many(githubIntegrations),
    brandSettings: one(brandSettings),
    posts: many(posts),
  })
);

export const membersRelations = relations(members, ({ one }) => ({
  organizations: one(organizations, {
    fields: [members.organizationId],
    references: [organizations.id],
  }),
  users: one(users, {
    fields: [members.userId],
    references: [users.id],
  }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  organizations: one(organizations, {
    fields: [invitations.organizationId],
    references: [organizations.id],
  }),
  users: one(users, {
    fields: [invitations.inviterId],
    references: [users.id],
  }),
}));

export const githubIntegrationsRelations = relations(
  githubIntegrations,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [githubIntegrations.organizationId],
      references: [organizations.id],
    }),
    createdByUser: one(users, {
      fields: [githubIntegrations.createdByUserId],
      references: [users.id],
    }),
    repositories: many(githubRepositories),
  })
);

export const githubRepositoriesRelations = relations(
  githubRepositories,
  ({ one, many }) => ({
    integration: one(githubIntegrations, {
      fields: [githubRepositories.integrationId],
      references: [githubIntegrations.id],
    }),
    outputs: many(repositoryOutputs),
  })
);

export const repositoryOutputsRelations = relations(
  repositoryOutputs,
  ({ one }) => ({
    repository: one(githubRepositories, {
      fields: [repositoryOutputs.repositoryId],
      references: [githubRepositories.id],
    }),
  })
);

export const brandSettingsRelations = relations(brandSettings, ({ one }) => ({
  organization: one(organizations, {
    fields: [brandSettings.organizationId],
    references: [organizations.id],
  }),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  organization: one(organizations, {
    fields: [posts.organizationId],
    references: [organizations.id],
  }),
}));
