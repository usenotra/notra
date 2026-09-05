import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import {
  AGENT_FEEDBACK_KINDS,
  AGENT_FEEDBACK_SENTIMENTS,
  AGENT_FEEDBACK_SOURCES,
  AGENT_FEEDBACK_STATUSES,
} from "./constants/agent-feedback";
import { BLOG_POST_SUBTYPES } from "./constants/content";
import { GEO_PERSONA_MEMORY_KINDS } from "./constants/geo-personas";
import { GEO_PROSPECT_REPORT_STATUSES } from "./constants/geo-prospect-reports";
import {
  GEO_CONTENT_BRIEF_STATUSES,
  GEO_WRITER_SOURCE_KINDS,
} from "./constants/geo-writer";
import type { AgentFeedbackMetadata } from "./types/agent-feedback";
import type {
  AgentReadinessIssue,
  AgentReadinessScoreBreakdown,
} from "./types/agent-readiness";
import type { GeoCheckGrounding } from "./types/geo-checks";
import type { GeoPersonaProfile } from "./types/geo-personas";
import type { GeoProspectReportJson } from "./types/geo-prospect-report";
import type { GeoContentBriefJson } from "./types/geo-writer";
import type { GoogleSearchConsoleQuery } from "./types/google-search-console";

export const lookbackWindowEnum = pgEnum("lookback_window", [
  "current_day",
  "yesterday",
  "last_7_days",
  "last_14_days",
  "last_30_days",
]);

export const postStatusEnum = pgEnum("post_status", ["draft", "published"]);

export const postCollectionSourceEnum = pgEnum("post_collection_source", [
  "manual",
  "chat",
  "schedule",
  "automation",
  "api",
  "backfill",
]);

export const postCollectionNameSourceEnum = pgEnum(
  "post_collection_name_source",
  ["generated", "user", "backfill"]
);

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
  role: text("role"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  hidePersonalData: boolean("hide_personal_data").default(false).notNull(),
  showAgentStats: boolean("show_agent_stats").default(false).notNull(),
  workosUserId: text("workos_user_id").unique(),
});

export const chatSessions = pgTable(
  "chat_sessions",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    contentId: text("content_id").references(() => posts.id, {
      onDelete: "cascade",
    }),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    messages: jsonb("messages")
      .notNull()
      .default(sql`'[]'::jsonb`),
    pinnedAt: timestamp("pinned_at"),
    deletedAt: timestamp("deleted_at"),
    externalChannelSource: text("external_channel_source"),
    externalChannelId: text("external_channel_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("chatSessions_organizationId_idx").on(table.organizationId),
    index("chatSessions_organizationId_deletedAt_idx").on(
      table.organizationId,
      table.deletedAt
    ),
    index("chatSessions_org_project_idx").on(
      table.projectId,
      table.organizationId
    ),
    index("chatSessions_org_content_deleted_updated_idx").on(
      table.organizationId,
      table.contentId,
      table.deletedAt,
      table.updatedAt
    ),
    uniqueIndex("chatSessions_org_externalChannel_uidx")
      .on(
        table.organizationId,
        table.externalChannelSource,
        table.externalChannelId
      )
      .where(
        sql`${table.externalChannelSource} IN ('discord', 'slack') AND ${table.externalChannelId} IS NOT NULL AND ${table.deletedAt} IS NULL`
      ),
  ]
);

export const agentSessions = pgTable(
  "agent_sessions",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id"),
    chatId: text("chat_id").references(() => chatSessions.id, {
      onDelete: "cascade",
    }),
    surface: text("surface").notNull(),
    contentId: text("content_id"),
    collectionId: text("collection_id"),
    eveSessionId: text("eve_session_id").notNull(),
    continuationToken: text("continuation_token").notNull(),
    streamIndex: integer("stream_index").notNull().default(0),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("agentSessions_eveSessionId_uidx").on(table.eveSessionId),
    index("agentSessions_organizationId_idx").on(table.organizationId),
    index("agentSessions_chatId_idx").on(table.chatId),
  ]
);

export const chatAttachments = pgTable(
  "chat_attachments",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull().unique(),
    filename: text("filename").notNull(),
    mediaType: text("media_type").notNull(),
    size: integer("size").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("chatAttachments_organizationId_createdAt_idx").on(
      table.organizationId,
      table.createdAt
    ),
    index("chatAttachments_userId_idx").on(table.userId),
  ]
);

export const socialConnections = pgTable(
  "social_connections",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    scope: text("scope"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("socialConnections_userId_provider_uidx").on(
      table.userId,
      table.provider
    ),
    index("socialConnections_userId_idx").on(table.userId),
  ]
);

export const organizations = pgTable(
  "organizations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    logo: text("logo"),
    createdAt: timestamp("created_at").notNull(),
    metadata: text("metadata"),
    heardAboutNotraSource: text("heard_about_notra_source"),
    heardAboutNotraOther: text("heard_about_notra_other"),
    geoIngestTokenGeneration: integer("geo_ingest_token_generation")
      .notNull()
      .default(1),
    feedbackIngestTokenGeneration: integer("feedback_ingest_token_generation")
      .notNull()
      .default(1),
    onboardingCompleted: boolean("onboarding_completed")
      .default(false)
      .notNull(),
    onboardingDismissed: boolean("onboarding_dismissed")
      .default(false)
      .notNull(),
    onboardingAgentRan: boolean("onboarding_agent_ran")
      .default(false)
      .notNull(),
    onboardingAgentStartedAt: timestamp("onboarding_agent_started_at"),
    workosOrgId: text("workos_org_id").unique(),
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

export const githubAppInstallations = pgTable(
  "github_app_installations",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    installationId: text("installation_id").notNull(),
    accountId: text("account_id").notNull(),
    accountLogin: text("account_login").notNull(),
    accountName: text("account_name"),
    accountAvatarUrl: text("account_avatar_url").notNull(),
    accountType: text("account_type").notNull(),
    repositorySelection: text("repository_selection"),
    enabled: boolean("enabled").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("githubAppInstallations_organizationId_idx").on(table.organizationId),
    index("githubAppInstallations_createdByUserId_idx").on(
      table.createdByUserId
    ),
    uniqueIndex("githubAppInstallations_organization_installation_uidx").on(
      table.organizationId,
      table.installationId
    ),
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
    githubAppInstallationId: text("github_app_installation_id").references(
      () => githubAppInstallations.id,
      { onDelete: "cascade" }
    ),
    githubRepositoryId: text("github_repository_id"),
    githubRepositoryPrivate: boolean("github_repository_private"),
    owner: text("owner"),
    repo: text("repo"),
    defaultBranch: text("default_branch"),
    repositoryEnabled: boolean("repository_enabled").default(true).notNull(),
    encryptedWebhookSecret: text("encrypted_webhook_secret"),
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
    uniqueIndex("githubIntegrations_organization_owner_repo_uidx").on(
      table.organizationId,
      table.owner,
      table.repo
    ),
  ]
);

export const linearIntegrations = pgTable(
  "linear_integrations",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    encryptedAccessToken: text("encrypted_access_token"),
    linearOrganizationId: text("linear_organization_id").notNull(),
    linearOrganizationName: text("linear_organization_name"),
    linearTeamId: text("linear_team_id"),
    linearTeamName: text("linear_team_name"),
    encryptedWebhookSecret: text("encrypted_webhook_secret"),
    enabled: boolean("enabled").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("linearIntegrations_organizationId_idx").on(table.organizationId),
    index("linearIntegrations_createdByUserId_idx").on(table.createdByUserId),
    uniqueIndex("linearIntegrations_org_linearOrg_team_uidx").on(
      table.organizationId,
      table.linearOrganizationId,
      table.linearTeamId
    ),
    uniqueIndex("linearIntegrations_org_linearOrg_no_team_uidx")
      .on(table.organizationId, table.linearOrganizationId)
      .where(sql`${table.linearTeamId} IS NULL`),
  ]
);

export const slackIntegrations = pgTable(
  "slack_integrations",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    encryptedBotToken: text("encrypted_bot_token").notNull(),
    slackTeamId: text("slack_team_id").notNull(),
    slackTeamName: text("slack_team_name"),
    slackBotUserId: text("slack_bot_user_id"),
    allowedChannelIds: jsonb("allowed_channel_ids").$type<string[] | null>(),
    notificationChannelId: text("notification_channel_id"),
    enabled: boolean("enabled").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("slackIntegrations_organizationId_idx").on(table.organizationId),
    index("slackIntegrations_createdByUserId_idx").on(table.createdByUserId),
    uniqueIndex("slackIntegrations_teamId_uidx").on(table.slackTeamId),
  ]
);

export const granolaIntegrations = pgTable(
  "granola_integrations",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    encryptedApiKey: text("encrypted_api_key").notNull(),
    workspaceName: text("workspace_name"),
    enabled: boolean("enabled").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("granolaIntegrations_organizationId_idx").on(table.organizationId),
    index("granolaIntegrations_createdByUserId_idx").on(table.createdByUserId),
  ]
);

export const mcpServerIntegrations = pgTable(
  "mcp_server_integrations",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    url: text("url").notNull(),
    description: text("description"),
    resourceType: text("resource_type")
      .$type<"connection" | "store_listing">()
      .default("connection")
      .notNull(),
    author: text("author"),
    websiteUrl: text("website_url"),
    brandColor: text("brand_color"),
    logoLightUrl: text("logo_light_url"),
    logoDarkUrl: text("logo_dark_url"),
    bannerUrl: text("banner_url"),
    slug: text("slug"),
    category: text("category"),
    storeFeaturedAt: timestamp("store_featured_at"),
    storeSourceIntegrationId: text("store_source_integration_id"),
    storeStatus: text("store_status").default("draft").notNull(),
    reviewNote: text("review_note"),
    submittedAt: timestamp("submitted_at"),
    reviewedAt: timestamp("reviewed_at"),
    authType: text("auth_type").default("none").notNull(),
    encryptedHeaders: jsonb("encrypted_headers")
      .$type<Record<string, string>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    lastToolSyncAt: timestamp("last_tool_sync_at"),
    toolSyncStatus: text("tool_sync_status").default("idle").notNull(),
    toolSyncError: text("tool_sync_error"),
    indexedToolCount: integer("indexed_tool_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    check(
      "mcpServerIntegrations_authType_check",
      sql`${table.authType} IN ('none', 'headers', 'oauth')`
    ),
    check(
      "mcpServerIntegrations_storeStatus_check",
      sql`${table.storeStatus} IN ('draft', 'pending_review', 'live', 'rejected')`
    ),
    check(
      "mcpServerIntegrations_resourceType_check",
      sql`${table.resourceType} IN ('connection', 'store_listing')`
    ),
    check(
      "mcpServerIntegrations_category_check",
      sql`${table.category} IS NULL OR ${table.category} IN ('AI', 'Source control', 'Project management', 'Communication', 'Design', 'Notes', 'Deploys', 'Productivity', 'Marketing', 'Publishing')`
    ),
    check(
      "mcpServerIntegrations_resourceState_check",
      sql`(
        (${table.resourceType} = 'store_listing' AND ${table.storeSourceIntegrationId} IS NULL)
        OR
        (${table.resourceType} = 'connection' AND ${table.storeStatus} = 'draft' AND ${table.reviewNote} IS NULL AND ${table.submittedAt} IS NULL AND ${table.reviewedAt} IS NULL)
      )`
    ),
    index("mcpServerIntegrations_resourceType_idx").on(table.resourceType),
    index("mcpServerIntegrations_storeStatus_idx").on(table.storeStatus),
    index("mcpServerIntegrations_organizationId_idx").on(table.organizationId),
    index("mcpServerIntegrations_createdByUserId_idx").on(
      table.createdByUserId
    ),
    index("mcpServerIntegrations_storeSourceIntegrationId_idx").on(
      table.storeSourceIntegrationId
    ),
    uniqueIndex("mcpServerIntegrations_org_id_uidx").on(
      table.organizationId,
      table.id
    ),
    uniqueIndex("mcpServerIntegrations_org_resourceType_name_uidx").on(
      table.organizationId,
      table.resourceType,
      table.name
    ),
    uniqueIndex("mcpServerIntegrations_org_storeSource_uidx")
      .on(table.organizationId, table.storeSourceIntegrationId)
      .where(sql`${table.storeSourceIntegrationId} IS NOT NULL`),
    uniqueIndex("mcpServerIntegrations_storeListing_slug_uidx")
      .on(table.slug)
      .where(sql`${table.resourceType} = 'store_listing'`),
    foreignKey({
      columns: [table.storeSourceIntegrationId],
      foreignColumns: [table.id],
      name: "mcpServerIntegrations_storeSourceIntegrationId_fk",
    }).onDelete("set null"),
  ]
);

export const mcpOAuthCredentials = pgTable(
  "mcp_oauth_credentials",
  {
    serverIntegrationId: text("server_integration_id")
      .primaryKey()
      .references(() => mcpServerIntegrations.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    connectedByUserId: text("connected_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    encryptedTokens: text("encrypted_tokens").notNull(),
    encryptedClientInformation: text("encrypted_client_information"),
    encryptedAuthorizationServerInformation: text(
      "encrypted_authorization_server_information"
    ),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    accessTokenRefreshAt: timestamp("access_token_refresh_at"),
    status: text("status").default("connected").notNull(),
    tokenVersion: integer("token_version").default(1).notNull(),
    refreshLeaseId: text("refresh_lease_id"),
    refreshLeaseExpiresAt: timestamp("refresh_lease_expires_at"),
    lastRefreshedAt: timestamp("last_refreshed_at"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    check(
      "mcpOAuthCredentials_status_check",
      sql`${table.status} IN ('connected', 'refreshing', 'reauth_required')`
    ),
    index("mcpOAuthCredentials_organizationId_idx").on(table.organizationId),
    index("mcpOAuthCredentials_connectedByUserId_idx").on(
      table.connectedByUserId
    ),
    foreignKey({
      columns: [table.organizationId, table.serverIntegrationId],
      foreignColumns: [
        mcpServerIntegrations.organizationId,
        mcpServerIntegrations.id,
      ],
      name: "mcpOAuthCredentials_org_server_fk",
    }).onDelete("cascade"),
  ]
);

export const mcpOAuthPendingAuthorizations = pgTable(
  "mcp_oauth_pending_authorizations",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    serverIntegrationId: text("server_integration_id").references(
      () => mcpServerIntegrations.id,
      { onDelete: "cascade" }
    ),
    storeSourceIntegrationId: text("store_source_integration_id"),
    name: text("name").notNull(),
    url: text("url").notNull(),
    description: text("description"),
    callbackPath: text("callback_path").notNull(),
    stateHash: text("state_hash").notNull().unique(),
    encryptedState: text("encrypted_state").notNull(),
    encryptedCodeVerifier: text("encrypted_code_verifier"),
    encryptedClientInformation: text("encrypted_client_information"),
    encryptedAuthorizationServerInformation: text(
      "encrypted_authorization_server_information"
    ),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("mcpOAuthPendingAuthorizations_organizationId_idx").on(
      table.organizationId
    ),
    index("mcpOAuthPendingAuthorizations_userId_idx").on(table.userId),
    index("mcpOAuthPendingAuthorizations_serverIntegrationId_idx").on(
      table.serverIntegrationId
    ),
    index("mcpOAuthPendingAuthorizations_storeSourceIntegrationId_idx").on(
      table.storeSourceIntegrationId
    ),
    index("mcpOAuthPendingAuthorizations_expiresAt_idx").on(table.expiresAt),
    foreignKey({
      columns: [table.organizationId, table.serverIntegrationId],
      foreignColumns: [
        mcpServerIntegrations.organizationId,
        mcpServerIntegrations.id,
      ],
      name: "mcpOAuthPendingAuthorizations_org_server_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.storeSourceIntegrationId],
      foreignColumns: [mcpServerIntegrations.id],
      name: "mcpOAuthPendingAuthorizations_storeSourceIntegrationId_fk",
    }).onDelete("cascade"),
  ]
);

export const mcpToolIndex = pgTable(
  "mcp_tool_index",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    serverIntegrationId: text("server_integration_id")
      .notNull()
      .references(() => mcpServerIntegrations.id, { onDelete: "cascade" }),
    serverToolName: text("server_tool_name").notNull(),
    runtimeToolName: text("runtime_tool_name").notNull(),
    title: text("title"),
    description: text("description"),
    actionPhrasePresent: text("action_phrase_present"),
    actionPhrasePast: text("action_phrase_past"),
    inputSchema: jsonb("input_schema").notNull(),
    outputSchema: jsonb("output_schema"),
    annotations: jsonb("annotations"),
    meta: jsonb("meta"),
    schemaHash: text("schema_hash").notNull(),
    searchText: text("search_text").notNull(),
    status: text("status").default("active").notNull(),
    lastSeenAt: timestamp("last_seen_at"),
    lastIndexedAt: timestamp("last_indexed_at").defaultNow().notNull(),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("mcpToolIndex_server_tool_uidx").on(
      table.serverIntegrationId,
      table.serverToolName
    ),
    uniqueIndex("mcpToolIndex_org_id_uidx").on(table.organizationId, table.id),
    uniqueIndex("mcpToolIndex_org_runtime_tool_uidx").on(
      table.organizationId,
      table.runtimeToolName
    ),
    index("mcpToolIndex_organizationId_status_idx").on(
      table.organizationId,
      table.status
    ),
    index("mcpToolIndex_serverIntegrationId_status_idx").on(
      table.serverIntegrationId,
      table.status
    ),
    index("mcpToolIndex_searchText_gin_idx").using(
      "gin",
      sql`to_tsvector('english', ${table.searchText})`
    ),
    foreignKey({
      columns: [table.organizationId, table.serverIntegrationId],
      foreignColumns: [
        mcpServerIntegrations.organizationId,
        mcpServerIntegrations.id,
      ],
      name: "mcpToolIndex_org_server_fk",
    }).onDelete("cascade"),
  ]
);

export const mcpSessionToolActivations = pgTable(
  "mcp_session_tool_activations",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    sessionId: text("session_id").notNull(),
    surface: text("surface").notNull(),
    mcpToolIndexId: text("mcp_tool_index_id")
      .notNull()
      .references(() => mcpToolIndex.id, { onDelete: "cascade" }),
    runtimeToolName: text("runtime_tool_name").notNull(),
    sourceQuery: text("source_query"),
    activatedAt: timestamp("activated_at").defaultNow().notNull(),
    lastUsedAt: timestamp("last_used_at"),
    expiresAt: timestamp("expires_at"),
  },
  (table) => [
    uniqueIndex("mcpSessionToolActivations_session_tool_uidx").on(
      table.organizationId,
      table.sessionId,
      table.surface,
      table.mcpToolIndexId
    ),
    index("mcpSessionToolActivations_session_idx").on(
      table.organizationId,
      table.sessionId,
      table.surface
    ),
    index("mcpSessionToolActivations_expiresAt_idx").on(table.expiresAt),
    foreignKey({
      columns: [table.organizationId, table.mcpToolIndexId],
      foreignColumns: [mcpToolIndex.organizationId, mcpToolIndex.id],
      name: "mcpSessionToolActivations_org_tool_fk",
    }).onDelete("cascade"),
  ]
);

export const contentTriggers = pgTable(
  "content_triggers",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull().default("Untitled Schedule"),
    sourceType: text("source_type").notNull(),
    sourceConfig: jsonb("source_config").notNull(),
    targets: jsonb("targets").notNull(),
    outputType: text("output_type").notNull(),
    outputConfig: jsonb("output_config"),
    dedupeHash: text("dedupe_hash").notNull(),
    qstashScheduleId: text("qstash_schedule_id"),
    enabled: boolean("enabled").default(true).notNull(),
    autoPublish: boolean("auto_publish").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("contentTriggers_organizationId_idx").on(table.organizationId),
    uniqueIndex("contentTriggers_organization_dedupe_uidx").on(
      table.organizationId,
      table.dedupeHash
    ),
  ]
);

export const contentTriggerLookbackWindows = pgTable(
  "content_trigger_lookback_windows",
  {
    triggerId: text("trigger_id")
      .primaryKey()
      .references(() => contentTriggers.id, { onDelete: "cascade" }),
    window: lookbackWindowEnum("window").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  }
);

export const repositoryOutputs = pgTable(
  "repository_outputs",
  {
    id: text("id").primaryKey(),
    repositoryId: text("repository_id")
      .notNull()
      .references(() => githubIntegrations.id, { onDelete: "cascade" }),
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
    name: text("name").notNull().default("Default"),
    isDefault: boolean("is_default").notNull().default(true),
    websiteUrl: text("website_url").notNull(),
    companyName: text("company_name"),
    companyDescription: text("company_description"),
    toneProfile: text("tone_profile"),
    customTone: text("custom_tone"),
    customInstructions: text("custom_instructions"),
    audience: text("audience"),
    language: text("language").default("English"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    check(
      "brandSettings_toneProfile_check",
      sql`${table.toneProfile} IS NULL OR ${table.toneProfile} IN ('Conversational', 'Professional', 'Casual', 'Formal')`
    ),
    uniqueIndex("brandSettings_org_name_uidx").on(
      table.organizationId,
      table.name
    ),
    uniqueIndex("brandSettings_org_default_uidx")
      .on(table.organizationId)
      .where(sql`${table.isDefault} = true`),
    index("brandSettings_organizationId_idx").on(table.organizationId),
  ]
);

export const referenceTypeEnum = pgEnum("reference_type", [
  "twitter_post",
  "linkedin_post",
  "blog_post",
  "custom",
]);

export const applicablePlatformEnum = pgEnum("applicable_platform", [
  "all",
  "twitter",
  "linkedin",
  "blog",
]);

export const brandSitemapStatusEnum = pgEnum("brand_sitemap_status", [
  "queued",
  "crawling",
  "ready",
  "failed",
]);

export const brandSitemapPageCategoryEnum = pgEnum(
  "brand_sitemap_page_category",
  ["crawled", "redirect", "queued", "failed"]
);

export const brandGuidelineStatusEnum = pgEnum("brand_guideline_status", [
  "queued",
  "generating",
  "ready",
  "failed",
]);

export const brandGuidelineColorRoleEnum = pgEnum(
  "brand_guideline_color_role",
  [
    "primary",
    "secondary",
    "accent",
    "background",
    "foreground",
    "neutral",
    "custom",
  ]
);

export const brandGuidelineFontRoleEnum = pgEnum("brand_guideline_font_role", [
  "heading",
  "body",
  "button",
  "unknown",
]);

export const brandGuidelineTokenTypeEnum = pgEnum(
  "brand_guideline_token_type",
  ["spacing", "radius", "shadow", "component", "unknown"]
);

export const brandGuidelineAssetKindEnum = pgEnum(
  "brand_guideline_asset_kind",
  ["logo", "wordmark"]
);

export const brandGuidelineAssetVariantEnum = pgEnum(
  "brand_guideline_asset_variant",
  ["light", "dark"]
);

export const brandGuidelineScreenshotKindEnum = pgEnum(
  "brand_guideline_screenshot_kind",
  ["desktop_hero", "desktop_full_page", "mobile_hero"]
);

export const brandReferences = pgTable(
  "brand_references",
  {
    id: text("id").primaryKey(),
    brandSettingsId: text("brand_settings_id")
      .notNull()
      .references(() => brandSettings.id, { onDelete: "cascade" }),
    type: referenceTypeEnum("type").notNull(),
    content: text("content").notNull(),
    sourceUrl: text("source_url"),
    sourceSnapshotKey: text("source_snapshot_key"),
    sourceContentHash: text("source_content_hash"),
    sourceCapturedAt: timestamp("source_captured_at"),
    metadata: jsonb("metadata"),
    note: text("note"),
    supermemoryDocumentId: text("supermemory_document_id"),
    supermemoryMemoryId: text("supermemory_memory_id"),
    supermemorySyncedAt: timestamp("supermemory_synced_at"),
    supermemoryLastSyncError: text("supermemory_last_sync_error"),
    applicableTo: applicablePlatformEnum("applicable_to")
      .array()
      .default(sql`ARRAY['all']::applicable_platform[]`)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("brandReferences_brandSettingsId_idx").on(table.brandSettingsId),
    index("brandReferences_brandSettingsId_sourceUrl_idx").on(
      table.brandSettingsId,
      table.sourceUrl
    ),
  ]
);

export const brandGuidelines = pgTable(
  "brand_guidelines",
  {
    id: text("id").primaryKey(),
    brandSettingsId: text("brand_settings_id")
      .notNull()
      .references(() => brandSettings.id, { onDelete: "cascade" }),
    status: brandGuidelineStatusEnum("status").default("queued").notNull(),
    contextDevMeta: jsonb("context_dev_meta"),
    lastGeneratedAt: timestamp("last_generated_at"),
    lastGenerationError: text("last_generation_error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("brandGuidelines_brandSettingsId_uidx").on(
      table.brandSettingsId
    ),
    index("brandGuidelines_status_idx").on(table.status),
  ]
);

export const brandGuidelineColors = pgTable(
  "brand_guideline_colors",
  {
    id: text("id").primaryKey(),
    guidelineId: text("guideline_id")
      .notNull()
      .references(() => brandGuidelines.id, { onDelete: "cascade" }),
    role: brandGuidelineColorRoleEnum("role").default("custom").notNull(),
    name: text("name"),
    lightValue: text("light_value").notNull(),
    darkValue: text("dark_value"),
    usage: text("usage"),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("brandGuidelineColors_guidelineId_idx").on(table.guidelineId),
    index("brandGuidelineColors_guideline_role_idx").on(
      table.guidelineId,
      table.role
    ),
  ]
);

export const brandGuidelineFonts = pgTable(
  "brand_guideline_fonts",
  {
    id: text("id").primaryKey(),
    guidelineId: text("guideline_id")
      .notNull()
      .references(() => brandGuidelines.id, { onDelete: "cascade" }),
    role: brandGuidelineFontRoleEnum("role").default("unknown").notNull(),
    family: text("family").notNull(),
    weight: text("weight"),
    size: text("size"),
    lineHeight: text("line_height"),
    source: text("source"),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("brandGuidelineFonts_guidelineId_idx").on(table.guidelineId),
    index("brandGuidelineFonts_guideline_role_idx").on(
      table.guidelineId,
      table.role
    ),
  ]
);

export const brandGuidelineTokens = pgTable(
  "brand_guideline_tokens",
  {
    id: text("id").primaryKey(),
    guidelineId: text("guideline_id")
      .notNull()
      .references(() => brandGuidelines.id, { onDelete: "cascade" }),
    type: brandGuidelineTokenTypeEnum("type").default("unknown").notNull(),
    name: text("name").notNull(),
    value: text("value").notNull(),
    source: text("source"),
    metadata: jsonb("metadata"),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("brandGuidelineTokens_guidelineId_idx").on(table.guidelineId),
    index("brandGuidelineTokens_guideline_type_idx").on(
      table.guidelineId,
      table.type
    ),
  ]
);

export const brandGuidelineAssets = pgTable(
  "brand_guideline_assets",
  {
    id: text("id").primaryKey(),
    guidelineId: text("guideline_id")
      .notNull()
      .references(() => brandGuidelines.id, { onDelete: "cascade" }),
    kind: brandGuidelineAssetKindEnum("kind").notNull(),
    url: text("url").notNull(),
    storageKey: text("storage_key"),
    format: text("format"),
    mimeType: text("mime_type"),
    width: integer("width"),
    height: integer("height"),
    aspectRatio: real("aspect_ratio"),
    variant: brandGuidelineAssetVariantEnum("variant").notNull(),
    capturedAt: timestamp("captured_at"),
    metadata: jsonb("metadata"),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("brandGuidelineAssets_guidelineId_idx").on(table.guidelineId),
    index("brandGuidelineAssets_guideline_kind_idx").on(
      table.guidelineId,
      table.kind
    ),
    uniqueIndex("brandGuidelineAssets_guideline_kind_variant_uidx").on(
      table.guidelineId,
      table.kind,
      table.variant
    ),
  ]
);

export const brandGuidelineScreenshots = pgTable(
  "brand_guideline_screenshots",
  {
    id: text("id").primaryKey(),
    guidelineId: text("guideline_id")
      .notNull()
      .references(() => brandGuidelines.id, { onDelete: "cascade" }),
    kind: brandGuidelineScreenshotKindEnum("kind").notNull(),
    url: text("url").notNull(),
    storageKey: text("storage_key"),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    format: text("format").notNull(),
    fullPage: boolean("full_page").default(false).notNull(),
    capturedAt: timestamp("captured_at"),
    metadata: jsonb("metadata"),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("brandGuidelineScreenshots_guidelineId_idx").on(table.guidelineId),
    uniqueIndex("brandGuidelineScreenshots_guideline_kind_uidx").on(
      table.guidelineId,
      table.kind
    ),
  ]
);

export const brandSitemaps = pgTable(
  "brand_sitemaps",
  {
    id: text("id").primaryKey(),
    brandSettingsId: text("brand_settings_id")
      .notNull()
      .references(() => brandSettings.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    url: text("url").notNull(),
    hostname: text("hostname").notNull(),
    status: brandSitemapStatusEnum("status").default("queued").notNull(),
    totalPages: integer("total_pages").default(0).notNull(),
    indexedPages: integer("indexed_pages").default(0).notNull(),
    failedPages: integer("failed_pages").default(0).notNull(),
    contextDevMeta: jsonb("context_dev_meta"),
    lastCrawlStartedAt: timestamp("last_crawl_started_at"),
    lastCrawledAt: timestamp("last_crawled_at"),
    lastCrawlError: text("last_crawl_error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("brandSitemaps_brandSettingsId_idx").on(table.brandSettingsId),
    uniqueIndex("brandSitemaps_brandSettings_url_uidx").on(
      table.brandSettingsId,
      table.url
    ),
  ]
);

export const brandSitemapPages = pgTable(
  "brand_sitemap_pages",
  {
    id: text("id").primaryKey(),
    sitemapId: text("sitemap_id")
      .notNull()
      .references(() => brandSitemaps.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    path: text("path").notNull(),
    title: text("title"),
    category: brandSitemapPageCategoryEnum("category").notNull(),
    statusCode: integer("status_code"),
    redirectTarget: text("redirect_target"),
    wordCount: integer("word_count"),
    textRatio: real("text_ratio"),
    internalLinks: integer("internal_links"),
    externalLinks: integer("external_links"),
    crawledAt: timestamp("crawled_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("brandSitemapPages_sitemapId_idx").on(table.sitemapId),
    index("brandSitemapPages_sitemap_category_idx").on(
      table.sitemapId,
      table.category
    ),
    uniqueIndex("brandSitemapPages_sitemap_url_uidx").on(
      table.sitemapId,
      table.url
    ),
  ]
);

export const connectedSocialAccounts = pgTable(
  "connected_social_accounts",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    username: text("username").notNull(),
    displayName: text("display_name").notNull(),
    profileImageUrl: text("profile_image_url"),
    verified: boolean("verified").default(false).notNull(),
    verifiedType: text("verified_type"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("connectedSocialAccounts_organizationId_idx").on(
      table.organizationId
    ),
    uniqueIndex("connectedSocialAccounts_org_provider_account_uidx").on(
      table.organizationId,
      table.provider,
      table.providerAccountId
    ),
  ]
);

export const trackedSocialAccounts = pgTable(
  "tracked_social_accounts",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    username: text("username").notNull(),
    displayName: text("display_name"),
    profileImageUrl: text("profile_image_url"),
    verified: boolean("verified").notNull().default(false),
    verifiedType: text("verified_type"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("trackedSocialAccounts_organizationId_idx").on(table.organizationId),
    uniqueIndex("trackedSocialAccounts_org_provider_account_uidx").on(
      table.organizationId,
      table.provider,
      table.providerAccountId
    ),
  ]
);

export const organizationNotificationSettings = pgTable(
  "organization_notification_settings",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    scheduledContentCreation: boolean("scheduled_content_creation")
      .default(false)
      .notNull(),
    scheduledContentFailed: boolean("scheduled_content_failed")
      .default(true)
      .notNull(),
    scheduledContentSkipped: boolean("scheduled_content_skipped")
      .default(false)
      .notNull(),
    marketingEmails: boolean("marketing_emails").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("orgNotificationSettings_organizationId_uidx").on(
      table.organizationId
    ),
  ]
);

export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    brandSettingsId: text("brand_settings_id")
      .notNull()
      .references(() => brandSettings.id),
    isSample: boolean("is_sample").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("projects_organizationId_idx").on(table.organizationId),
    uniqueIndex("projects_organizationId_sample_uidx")
      .on(table.organizationId)
      .where(sql`${table.isSample} = true`),
  ]
);

export const agentFeedback = pgTable(
  "agent_feedback",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    source: text("source", { enum: AGENT_FEEDBACK_SOURCES })
      .notNull()
      .default("api"),
    kind: text("kind", { enum: AGENT_FEEDBACK_KINDS })
      .notNull()
      .default("other"),
    sentiment: text("sentiment", { enum: AGENT_FEEDBACK_SENTIMENTS }),
    status: text("status", { enum: AGENT_FEEDBACK_STATUSES })
      .notNull()
      .default("new"),
    title: text("title"),
    message: text("message").notNull(),
    agentClient: text("agent_client"),
    agentModel: text("agent_model"),
    toolVersion: text("tool_version"),
    userAgent: text("user_agent"),
    contextUrl: text("context_url"),
    externalId: text("external_id"),
    idempotencyKey: text("idempotency_key"),
    metadata: jsonb("metadata").$type<AgentFeedbackMetadata>(),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("agentFeedback_organizationId_createdAt_idx").on(
      table.organizationId,
      table.createdAt
    ),
    index("agentFeedback_organizationId_status_idx").on(
      table.organizationId,
      table.status
    ),
    index("agentFeedback_projectId_idx").on(table.projectId),
    uniqueIndex("agentFeedback_organizationId_idempotencyKey_uidx").on(
      table.organizationId,
      table.idempotencyKey
    ),
  ]
);

export const geoSettings = pgTable(
  "geo_settings",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    companyName: text("company_name").notNull(),
    aliases: text("aliases")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    competitors: text("competitors")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    conversionPaths: text("conversion_paths")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    languages: text("languages").array(),
    // null = track the default engine set; otherwise a subset of GEO_ENGINES.
    engines: text("engines").array(),
    // Pro feature: ask every model host for zero data retention.
    enforceZdr: boolean("enforce_zdr").notNull().default(true),
    // Engines without a ZDR host the user explicitly approved anyway.
    nonZdrApprovedEngines: text("non_zdr_approved_engines")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    pausedAutoPromptIds: text("paused_auto_prompt_ids")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    enabled: boolean("enabled").notNull().default(true),
    scanIntervalHours: integer("scan_interval_hours").notNull().default(24),
    nextScanAt: timestamp("next_scan_at"),
    scanStartedAt: timestamp("scan_started_at"),
    lastScanAt: timestamp("last_scan_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("geoSettings_organizationId_idx").on(table.organizationId),
    uniqueIndex("geoSettings_projectId_uidx").on(table.projectId),
  ]
);

export const geoPrompts = pgTable(
  "geo_prompts",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    title: text("title"),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("geoPrompts_organizationId_idx").on(table.organizationId),
    index("geoPrompts_projectId_idx").on(table.projectId),
  ]
);

export const geoPromptSequences = pgTable(
  "geo_prompt_sequences",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    steps: text("steps")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("geoPromptSequences_organizationId_idx").on(table.organizationId),
    index("geoPromptSequences_projectId_idx").on(table.projectId),
  ]
);

export const geoPersonas = pgTable(
  "geo_personas",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    role: text("role").notNull(),
    company: text("company").notNull(),
    summary: text("summary").notNull(),
    searchStyle: text("search_style").notNull(),
    profile: jsonb("profile").$type<GeoPersonaProfile>().notNull(),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("geoPersonas_organizationId_idx").on(table.organizationId),
    index("geoPersonas_projectId_idx").on(table.projectId),
  ]
);

export const geoPersonaMemories = pgTable(
  "geo_persona_memories",
  {
    id: text("id").primaryKey(),
    personaId: text("persona_id")
      .notNull()
      .references(() => geoPersonas.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: GEO_PERSONA_MEMORY_KINDS }).notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("geoPersonaMemories_personaId_idx").on(table.personaId),
    index("geoPersonaMemories_projectId_idx").on(table.projectId),
  ]
);

export const geoCompetitors = pgTable(
  "geo_competitors",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    domain: text("domain"),
    synonyms: text("synonyms")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    kind: text("kind", { enum: ["direct", "indirect"] })
      .notNull()
      .default("direct"),
    color: text("color"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("geoCompetitors_organizationId_idx").on(table.organizationId),
    index("geoCompetitors_projectId_idx").on(table.projectId),
    uniqueIndex("geoCompetitors_projectId_name_uidx").on(
      table.projectId,
      table.name
    ),
  ]
);

export const geoShelfSources = pgTable(
  "geo_shelf_sources",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    domain: text("domain").notNull(),
    title: text("title"),
    kind: text("kind", {
      enum: [
        "listicle",
        "review_site",
        "community",
        "news",
        "docs",
        "video",
        "other",
      ],
    }).notNull(),
    ownership: text("ownership", {
      enum: ["third_party", "own", "competitor"],
    }).notNull(),
    origin: text("origin", { enum: ["scan", "manual"] }).notNull(),
    fetchStatus: text("fetch_status", {
      enum: ["pending", "ok", "blocked", "failed"],
    }).notNull(),
    lastFetchedAt: timestamp("last_fetched_at"),
    citations: jsonb("citations").notNull(),
    placements: jsonb("placements").notNull(),
    opportunity: jsonb("opportunity"),
    createdByUserId: text("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("geoShelfSources_organizationId_idx").on(table.organizationId),
    index("geoShelfSources_projectId_updatedAt_idx").on(
      table.projectId,
      table.updatedAt
    ),
    uniqueIndex("geoShelfSources_projectId_url_uidx").on(
      table.projectId,
      table.url
    ),
  ]
);

export const geoScans = pgTable(
  "geo_scans",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["running", "completed", "failed"] })
      .notNull()
      .default("running"),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    finishedAt: timestamp("finished_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("geoScans_organizationId_idx").on(table.organizationId),
    index("geoScans_projectId_startedAt_idx").on(
      table.projectId,
      table.startedAt
    ),
  ]
);

export const geoMentionChecks = pgTable(
  "geo_mention_checks",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    scanId: text("scan_id")
      .notNull()
      .references(() => geoScans.id, { onDelete: "cascade" }),
    engine: text("engine").notNull(),
    promptId: text("prompt_id").notNull(),
    sequenceId: text("sequence_id"),
    // Set on turns played by a simulated buyer persona; null for tracked
    // prompts and hand-written conversations.
    personaId: text("persona_id").references(() => geoPersonas.id, {
      onDelete: "cascade",
    }),
    turn: integer("turn").notNull().default(0),
    prompt: text("prompt").notNull(),
    answer: text("answer").notNull(),
    mentioned: boolean("mentioned").notNull(),
    position: integer("position"),
    sentiment: text("sentiment"),
    competitors: text("competitors")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    excerpt: text("excerpt").notNull().default(""),
    grounding: jsonb("grounding")
      .$type<GeoCheckGrounding>()
      .notNull()
      .default(sql`'{"queries":[],"sources":[]}'::jsonb`),
    language: text("language").notNull().default("English"),
    sources: jsonb("sources")
      .$type<{ url: string; title: string | null }[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    finishReason: text("finish_reason"),
    promptTokens: integer("prompt_tokens"),
    outputTokens: integer("output_tokens"),
    reasoningTokens: integer("reasoning_tokens"),
    // Whether the engine call ran with zero data retention enforced. Null on
    // rows written before the column existed or when the route did not say.
    zdrEnforced: boolean("zdr_enforced"),
    capturedAt: timestamp("captured_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("geoMentionChecks_organizationId_capturedAt_idx").on(
      table.organizationId,
      table.capturedAt
    ),
    index("geoMentionChecks_projectId_capturedAt_idx").on(
      table.projectId,
      table.capturedAt
    ),
    index("geoMentionChecks_projectEnginePrompt_idx").on(
      table.projectId,
      table.engine,
      table.promptId,
      table.capturedAt
    ),
    index("geoMentionChecks_scanId_idx").on(table.scanId),
    index("geoMentionChecks_personaId_capturedAt_idx").on(
      table.personaId,
      table.capturedAt
    ),
    uniqueIndex("geoMentionChecks_scanEnginePromptTurnLanguage_uidx").on(
      table.scanId,
      table.engine,
      table.promptId,
      table.turn,
      table.language
    ),
  ]
);

export const geoAgentReadinessReports = pgTable(
  "geo_agent_readiness_reports",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    targetUrl: text("target_url").notNull(),
    status: text("status", { enum: ["running", "completed", "failed"] })
      .notNull()
      .default("running"),
    score: real("score"),
    scoreLabel: text("score_label"),
    scoreBreakdown: jsonb("score_breakdown")
      .$type<AgentReadinessScoreBreakdown | null>()
      .default(null),
    issues: jsonb("issues")
      .$type<AgentReadinessIssue[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    eligibleChecks: integer("eligible_checks"),
    reportUrl: text("report_url"),
    errorMessage: text("error_message"),
    scannedAt: timestamp("scanned_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("geoAgentReadinessReports_organizationId_idx").on(
      table.organizationId
    ),
    index("geoAgentReadinessReports_projectId_createdAt_idx").on(
      table.projectId,
      table.createdAt
    ),
    uniqueIndex("geoAgentReadinessReports_projectId_running_uidx")
      .on(table.projectId)
      .where(sql`${table.status} = 'running'`),
  ]
);

export const googleSearchConsoleIntegrations = pgTable(
  "google_search_console_integrations",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    googleAccountEmail: text("google_account_email"),
    encryptedAccessToken: text("encrypted_access_token").notNull(),
    encryptedRefreshToken: text("encrypted_refresh_token").notNull(),
    accessTokenExpiresAt: timestamp("access_token_expires_at").notNull(),
    siteUrl: text("site_url"),
    status: text("status", { enum: ["active", "reauth_required"] })
      .notNull()
      .default("active"),
    qstashScheduleId: text("qstash_schedule_id"),
    disconnectingAt: timestamp("disconnecting_at"),
    lastSyncedAt: timestamp("last_synced_at"),
    lastError: text("last_error"),
    topQueries: jsonb("top_queries")
      .$type<GoogleSearchConsoleQuery[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("googleSearchConsoleIntegrations_organizationId_uidx").on(
      table.organizationId
    ),
    index("googleSearchConsoleIntegrations_createdByUserId_idx").on(
      table.createdByUserId
    ),
  ]
);

export const geoPromptSuggestions = pgTable(
  "geo_prompt_suggestions",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    title: text("title"),
    source: text("source", { enum: ["search_console"] })
      .notNull()
      .default("search_console"),
    sourceKeywords: jsonb("source_keywords")
      .$type<
        {
          query: string;
          clicks: number;
          impressions: number;
          position: number;
        }[]
      >()
      .notNull()
      .default(sql`'[]'::jsonb`),
    status: text("status", { enum: ["pending", "accepted", "dismissed"] })
      .notNull()
      .default("pending"),
    acceptedPromptId: text("accepted_prompt_id").references(
      () => geoPrompts.id,
      { onDelete: "set null" }
    ),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("geoPromptSuggestions_organizationId_status_idx").on(
      table.organizationId,
      table.status
    ),
    uniqueIndex("geoPromptSuggestions_organizationId_prompt_uidx").on(
      table.organizationId,
      table.prompt
    ),
  ]
);

export const geoContentBriefs = pgTable(
  "geo_content_briefs",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    brandSettingsId: text("brand_settings_id")
      .notNull()
      .references(() => brandSettings.id, { onDelete: "restrict" }),
    createdByUserId: text("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    topic: text("topic").notNull(),
    brief: jsonb("brief").$type<GeoContentBriefJson>().notNull(),
    status: text("status", { enum: GEO_CONTENT_BRIEF_STATUSES })
      .notNull()
      .default("draft"),
    autoApproved: boolean("auto_approved").notNull().default(false),
    runId: text("run_id"),
    collectionId: text("collection_id").references(() => postCollections.id, {
      onDelete: "set null",
    }),
    postId: text("post_id").references(() => posts.id, {
      onDelete: "set null",
    }),
    humanized: boolean("humanized").notNull().default(false),
    sourceKind: text("source_kind", { enum: GEO_WRITER_SOURCE_KINDS })
      .notNull()
      .default("manual"),
    sourceId: text("source_id"),
    error: text("error"),
    approvedAt: timestamp("approved_at"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    publishedAt: timestamp("published_at"),
    rescanScanId: text("rescan_scan_id"),
    rescanRequestedAt: timestamp("rescan_requested_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("geoContentBriefs_organizationId_createdAt_idx").on(
      table.organizationId,
      table.createdAt
    ),
    index("geoContentBriefs_projectId_status_idx").on(
      table.projectId,
      table.status
    ),
    uniqueIndex("geoContentBriefs_open_source_uidx")
      .on(table.projectId, table.sourceKind, table.sourceId)
      .where(
        sql`${table.sourceKind} <> 'manual' AND ${table.sourceId} IS NOT NULL AND ${table.status} IN ('draft', 'approved', 'writing', 'failed')`
      ),
  ]
);

export const socialExperiments = pgTable(
  "social_experiments",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    hypothesis: text("hypothesis"),
    provider: text("provider").notNull(),
    variantAPostId: text("variant_a_post_id").notNull(),
    variantBPostId: text("variant_b_post_id").notNull(),
    metric: text("metric").notNull(),
    status: text("status").notNull().default("running"),
    winner: text("winner"),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    endedAt: timestamp("ended_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("socialExperiments_organizationId_idx").on(table.organizationId),
  ]
);

export const postCollections = pgTable(
  "post_collections",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    source: postCollectionSourceEnum("source").notNull(),
    sourceId: text("source_id"),
    name: text("name").notNull(),
    nameSource: postCollectionNameSourceEnum("name_source")
      .default("generated")
      .notNull(),
    contentTypes: jsonb("content_types")
      .default(sql`'[]'::jsonb`)
      .notNull(),
    sourceMetadata: jsonb("source_metadata"),
    expectedPostCount: integer("expected_post_count"),
    completedPostCount: integer("completed_post_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("post_collections_org_created_at_idx").on(
      table.organizationId,
      table.createdAt,
      table.id
    ),
    index("post_collections_source_idx").on(
      table.organizationId,
      table.source,
      table.sourceId
    ),
    index("post_collections_org_project_idx").on(
      table.projectId,
      table.organizationId
    ),
    uniqueIndex("post_collections_chat_source_uidx")
      .on(table.organizationId, table.source, table.sourceId)
      .where(sql`${table.source} = 'chat' AND ${table.sourceId} IS NOT NULL`),
  ]
);

export const posts = pgTable(
  "posts",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    collectionId: text("collection_id")
      .notNull()
      .references(() => postCollections.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    slug: text("slug"),
    content: text("content").notNull(),
    htmlUrl: text("html_url"),
    markdown: text("markdown"),
    recommendations: text("recommendations"),
    contentType: text("content_type").notNull(),
    contentSubtype: text("content_subtype", { enum: BLOG_POST_SUBTYPES }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    sourceMetadata: jsonb("source_metadata"),
    status: postStatusEnum("status").default("draft").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("posts_org_slug_uidx")
      .on(table.organizationId, table.slug)
      .where(sql`${table.slug} IS NOT NULL`),
    index("posts_org_createdAt_id_idx").on(
      table.organizationId,
      table.createdAt,
      table.id
    ),
    index("posts_collection_id_idx").on(table.collectionId),
  ]
);

export const skills = pgTable(
  "skills",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull(),
    content: text("content").notNull(),
    isSystem: boolean("is_system").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("skills_organizationId_idx").on(table.organizationId),
    uniqueIndex("skills_org_name_uidx").on(table.organizationId, table.name),
  ]
);

/**
 * Prospect-facing GEO reports built in the console and shared via `/r/{shareToken}`.
 * The report body is denormalised into a few columns for listing; the JSON is
 * the source of truth and includes the raw model answers from the scan.
 */
export const geoProspectReports = pgTable(
  "geo_prospect_reports",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    /** Unguessable token used in the public share link. */
    shareToken: text("share_token").notNull(),
    status: text("status", { enum: GEO_PROSPECT_REPORT_STATUSES })
      .notNull()
      .default("draft"),
    companyName: text("company_name").notNull().default(""),
    companyDomain: text("company_domain").notNull().default(""),
    visibilityScore: integer("visibility_score"),
    modelCount: integer("model_count").notNull().default(0),
    promptCount: integer("prompt_count").notNull().default(0),
    report: jsonb("report").$type<GeoProspectReportJson>().notNull(),
    lastScannedAt: timestamp("last_scanned_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("geoProspectReports_organizationId_idx").on(table.organizationId),
    uniqueIndex("geoProspectReports_shareToken_uidx").on(table.shareToken),
  ]
);

export const onboardingSuggestionTypeEnum = pgEnum(
  "onboarding_suggestion_type",
  ["schedule_automation", "event_automation"]
);

export const onboardingSuggestions = pgTable(
  "onboarding_suggestions",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    type: onboardingSuggestionTypeEnum("type").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    data: jsonb("data"),
    dismissed: boolean("dismissed").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("onboardingSuggestions_org_type_idx").on(
      table.organizationId,
      table.type
    ),
  ]
);

export const autonomyMandateStatusEnum = pgEnum("autonomy_mandate_status", [
  "active",
  "paused",
  "revoked",
]);

export const autonomyMandates = pgTable(
  "autonomy_mandates",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    objective: text("objective").notNull(),
    policy: jsonb("policy").notNull(),
    status: autonomyMandateStatusEnum("status").default("active").notNull(),
    version: integer("version").default(1).notNull(),
    qstashScheduleId: text("qstash_schedule_id"),
    createdByUserId: text("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    pausedAt: timestamp("paused_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("autonomyMandates_organizationId_idx").on(table.organizationId),
    uniqueIndex("autonomyMandates_organizationId_name_uidx").on(
      table.organizationId,
      table.name
    ),
  ]
);

export const autonomySignalStatusEnum = pgEnum("autonomy_signal_status", [
  "pending",
  "coalesced",
  "processed",
  "discarded",
]);

export const autonomySignals = pgTable(
  "autonomy_signals",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    sourceEventId: text("source_event_id"),
    kind: text("kind").notNull(),
    payload: jsonb("payload").notNull(),
    dedupeHash: text("dedupe_hash").notNull(),
    status: autonomySignalStatusEnum("status").default("pending").notNull(),
    coalescedIntoSignalId: text("coalesced_into_signal_id"),
    occurredAt: timestamp("occurred_at").notNull(),
    processedAt: timestamp("processed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("autonomySignals_organizationId_idx").on(table.organizationId),
    uniqueIndex("autonomySignals_organizationId_dedupeHash_uidx").on(
      table.organizationId,
      table.dedupeHash
    ),
    index("autonomySignals_organizationId_status_occurredAt_idx").on(
      table.organizationId,
      table.status,
      table.occurredAt
    ),
    foreignKey({
      columns: [table.coalescedIntoSignalId],
      foreignColumns: [table.id],
      name: "autonomySignals_coalescedIntoSignalId_fk",
    }).onDelete("set null"),
  ]
);

export const autonomyGoalStatusEnum = pgEnum("autonomy_goal_status", [
  "open",
  "in_progress",
  "blocked",
  "completed",
  "abandoned",
]);

export const autonomyGoals = pgTable(
  "autonomy_goals",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    mandateId: text("mandate_id")
      .notNull()
      .references(() => autonomyMandates.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    summary: text("summary"),
    status: autonomyGoalStatusEnum("status").default("open").notNull(),
    priority: integer("priority").default(0).notNull(),
    originSignalIds: jsonb("origin_signal_ids")
      .default(sql`'[]'::jsonb`)
      .notNull(),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("autonomyGoals_organizationId_idx").on(table.organizationId),
    index("autonomyGoals_mandateId_idx").on(table.mandateId),
    index("autonomyGoals_organizationId_status_idx").on(
      table.organizationId,
      table.status
    ),
  ]
);

export const autonomyRunTriggerEnum = pgEnum("autonomy_run_trigger", [
  "signal",
  "wake",
  "manual",
  "repair",
]);

export const autonomyRunStatusEnum = pgEnum("autonomy_run_status", [
  "planning",
  "executing",
  "completed",
  "failed",
  "canceled",
]);

export const autonomyRuns = pgTable(
  "autonomy_runs",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    mandateId: text("mandate_id")
      .notNull()
      .references(() => autonomyMandates.id, { onDelete: "cascade" }),
    mandateVersion: integer("mandate_version").notNull(),
    goalId: text("goal_id").references(() => autonomyGoals.id, {
      onDelete: "set null",
    }),
    trigger: autonomyRunTriggerEnum("trigger").notNull(),
    plannerInputHash: text("planner_input_hash"),
    plannerOutput: jsonb("planner_output"),
    status: autonomyRunStatusEnum("status").default("planning").notNull(),
    costCents: integer("cost_cents").default(0).notNull(),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("autonomyRuns_organizationId_idx").on(table.organizationId),
    index("autonomyRuns_mandateId_idx").on(table.mandateId),
    index("autonomyRuns_goalId_idx").on(table.goalId),
    index("autonomyRuns_organizationId_status_idx").on(
      table.organizationId,
      table.status
    ),
  ]
);

export const autonomyTaskStatusEnum = pgEnum("autonomy_task_status", [
  "pending",
  "ready",
  "running",
  "waiting",
  "completed",
  "failed",
  "canceled",
]);

export const autonomyTasks = pgTable(
  "autonomy_tasks",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    goalId: text("goal_id")
      .notNull()
      .references(() => autonomyGoals.id, { onDelete: "cascade" }),
    runId: text("run_id").references(() => autonomyRuns.id, {
      onDelete: "set null",
    }),
    capabilityName: text("capability_name").notNull(),
    capabilityVersion: integer("capability_version").default(1).notNull(),
    params: jsonb("params").notNull(),
    dependsOnTaskIds: jsonb("depends_on_task_ids")
      .default(sql`'[]'::jsonb`)
      .notNull(),
    status: autonomyTaskStatusEnum("status").default("pending").notNull(),
    attempt: integer("attempt").default(0).notNull(),
    waitUntil: timestamp("wait_until"),
    result: jsonb("result"),
    errorMessage: text("error_message"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("autonomyTasks_organizationId_idx").on(table.organizationId),
    index("autonomyTasks_goalId_idx").on(table.goalId),
    index("autonomyTasks_runId_idx").on(table.runId),
    index("autonomyTasks_organizationId_status_waitUntil_idx").on(
      table.organizationId,
      table.status,
      table.waitUntil
    ),
  ]
);

export const autonomyActionStatusEnum = pgEnum("autonomy_action_status", [
  "pending",
  "executing",
  "succeeded",
  "failed",
  "unknown",
  "compensated",
  "canceled",
]);

export const autonomyActions = pgTable(
  "autonomy_actions",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    runId: text("run_id")
      .notNull()
      .references(() => autonomyRuns.id, { onDelete: "cascade" }),
    taskId: text("task_id").references(() => autonomyTasks.id, {
      onDelete: "set null",
    }),
    capabilityName: text("capability_name").notNull(),
    capabilityVersion: integer("capability_version").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    status: autonomyActionStatusEnum("status").default("pending").notNull(),
    externalRef: jsonb("external_ref"),
    error: jsonb("error"),
    startedAt: timestamp("started_at"),
    finishedAt: timestamp("finished_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("autonomyActions_organizationId_idx").on(table.organizationId),
    index("autonomyActions_runId_idx").on(table.runId),
    uniqueIndex("autonomyActions_org_capability_idempotency_uidx").on(
      table.organizationId,
      table.capabilityName,
      table.idempotencyKey
    ),
    index("autonomyActions_organizationId_status_idx").on(
      table.organizationId,
      table.status
    ),
  ]
);

export const autonomyCheckpoints = pgTable(
  "autonomy_checkpoints",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    runId: text("run_id")
      .notNull()
      .references(() => autonomyRuns.id, { onDelete: "cascade" }),
    taskId: text("task_id").references(() => autonomyTasks.id, {
      onDelete: "set null",
    }),
    kind: text("kind").notNull(),
    state: jsonb("state").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("autonomyCheckpoints_organizationId_idx").on(table.organizationId),
    index("autonomyCheckpoints_runId_idx").on(table.runId),
  ]
);

export const autonomyOutboxStatusEnum = pgEnum("autonomy_outbox_status", [
  "pending",
  "attempting",
  "delivered",
  "failed",
  "canceled",
]);

export const autonomyOutbox = pgTable(
  "autonomy_outbox",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    runId: text("run_id").references(() => autonomyRuns.id, {
      onDelete: "set null",
    }),
    destination: text("destination").notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    payload: jsonb("payload").notNull(),
    status: autonomyOutboxStatusEnum("status").default("pending").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    nextAttemptAt: timestamp("next_attempt_at"),
    lastError: text("last_error"),
    deliveredAt: timestamp("delivered_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("autonomyOutbox_organizationId_idx").on(table.organizationId),
    uniqueIndex("autonomyOutbox_org_destination_dedupeKey_uidx").on(
      table.organizationId,
      table.destination,
      table.dedupeKey
    ),
    index("autonomyOutbox_status_nextAttemptAt_idx").on(
      table.status,
      table.nextAttemptAt
    ),
  ]
);

export const autonomyClaims = pgTable(
  "autonomy_claims",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    scope: text("scope").notNull(),
    claimKey: text("claim_key").notNull(),
    ownerToken: text("owner_token").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("autonomyClaims_scope_claimKey_uidx").on(
      table.scope,
      table.claimKey
    ),
    index("autonomyClaims_expiresAt_idx").on(table.expiresAt),
  ]
);

export const autonomyControllerLeases = pgTable(
  "autonomy_controller_leases",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    ownerToken: text("owner_token").notNull(),
    fencingToken: integer("fencing_token").default(0).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("autonomyControllerLeases_organizationId_idx").on(
      table.organizationId
    ),
  ]
);

export interface PostSourceMetadata {
  triggerId?: string;
  triggerSourceType?: string;
  repositories?: { owner: string; repo: string }[];
  linearIntegrations?: Array<{ integrationId: string }>;
  lookbackWindow?: string;
  lookbackRange?: { start: string; end: string };
  eventType?: string;
  eventAction?: string;
  brandVoiceName?: string;
  brandVoiceId?: string;
  selectedCommitShas?: string[];
  selectedPullRequests?: Array<{ repositoryId: string; number: number }>;
  selectedReleases?: Array<{ repositoryId: string; tagName: string }>;
  selectedLinearIssues?: Array<{ integrationId: string; issueId: string }>;
  type?: "generated_image";
  chatId?: string | null;
  integrationId?: string;
  branch?: string;
  mode?: string;
  prompt?: string | null;
  prNumber?: number | null;
  commitSha?: string | null;
  sourcePostId?: string | null;
  briefId?: string;
  projectId?: string;
  geoSourceKind?: string;
  geoSourceId?: string | null;
  geoBaseline?: {
    sourcePromptId: string;
    mentionedEngines: number;
    totalEngines: number;
    capturedAt: string | null;
  } | null;
  sandbox?: {
    boxId?: string;
    snapshotId?: string;
    snapshotName?: string;
    snapshotSizeBytes?: number;
    snapshotCreatedAt?: string;
  } | null;
  usage?: unknown;
}

export const usersRelations = relations(users, ({ many }) => ({
  socialConnections: many(socialConnections),
  members: many(members),
  githubIntegrations: many(githubIntegrations),
  githubAppInstallations: many(githubAppInstallations),
  linearIntegrations: many(linearIntegrations),
  slackIntegrations: many(slackIntegrations),
  granolaIntegrations: many(granolaIntegrations),
  mcpServerIntegrations: many(mcpServerIntegrations),
  chatAttachments: many(chatAttachments),
}));

export const chatSessionsRelations = relations(chatSessions, ({ one }) => ({
  organization: one(organizations, {
    fields: [chatSessions.organizationId],
    references: [organizations.id],
  }),
  content: one(posts, {
    fields: [chatSessions.contentId],
    references: [posts.id],
  }),
}));

export const chatAttachmentsRelations = relations(
  chatAttachments,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [chatAttachments.organizationId],
      references: [organizations.id],
    }),
    user: one(users, {
      fields: [chatAttachments.userId],
      references: [users.id],
    }),
  })
);

export const socialConnectionsRelations = relations(
  socialConnections,
  ({ one }) => ({
    users: one(users, {
      fields: [socialConnections.userId],
      references: [users.id],
    }),
  })
);

export const organizationsRelations = relations(
  organizations,
  ({ many, one }) => ({
    members: many(members),
    githubIntegrations: many(githubIntegrations),
    githubAppInstallations: many(githubAppInstallations),
    linearIntegrations: many(linearIntegrations),
    slackIntegrations: many(slackIntegrations),
    granolaIntegrations: many(granolaIntegrations),
    mcpServerIntegrations: many(mcpServerIntegrations),
    mcpToolIndex: many(mcpToolIndex),
    mcpSessionToolActivations: many(mcpSessionToolActivations),
    brandSettings: many(brandSettings),
    notificationSettings: one(organizationNotificationSettings),
    projects: many(projects),
    agentFeedback: many(agentFeedback),
    geoSettings: many(geoSettings),
    geoPrompts: many(geoPrompts),
    geoPromptSuggestions: many(geoPromptSuggestions),
    googleSearchConsoleIntegration: one(googleSearchConsoleIntegrations),
    geoPromptSequences: many(geoPromptSequences),
    geoCompetitors: many(geoCompetitors),
    geoShelfSources: many(geoShelfSources),
    geoScans: many(geoScans),
    geoMentionChecks: many(geoMentionChecks),
    geoPersonas: many(geoPersonas),
    geoPersonaMemories: many(geoPersonaMemories),
    connectedSocialAccounts: many(connectedSocialAccounts),
    postCollections: many(postCollections),
    posts: many(posts),
    skills: many(skills),
    geoProspectReports: many(geoProspectReports),
    chatSessions: many(chatSessions),
    chatAttachments: many(chatAttachments),
    onboardingSuggestions: many(onboardingSuggestions),
    autonomyMandates: many(autonomyMandates),
    autonomySignals: many(autonomySignals),
    autonomyGoals: many(autonomyGoals),
    autonomyRuns: many(autonomyRuns),
    autonomyTasks: many(autonomyTasks),
    autonomyActions: many(autonomyActions),
    autonomyCheckpoints: many(autonomyCheckpoints),
    autonomyOutbox: many(autonomyOutbox),
    autonomyClaims: many(autonomyClaims),
    autonomyControllerLeases: many(autonomyControllerLeases),
  })
);

export const onboardingSuggestionsRelations = relations(
  onboardingSuggestions,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [onboardingSuggestions.organizationId],
      references: [organizations.id],
    }),
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
    outputs: many(repositoryOutputs),
  })
);

export const githubAppInstallationsRelations = relations(
  githubAppInstallations,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [githubAppInstallations.organizationId],
      references: [organizations.id],
    }),
    createdByUser: one(users, {
      fields: [githubAppInstallations.createdByUserId],
      references: [users.id],
    }),
  })
);

export const linearIntegrationsRelations = relations(
  linearIntegrations,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [linearIntegrations.organizationId],
      references: [organizations.id],
    }),
    createdByUser: one(users, {
      fields: [linearIntegrations.createdByUserId],
      references: [users.id],
    }),
  })
);

export const slackIntegrationsRelations = relations(
  slackIntegrations,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [slackIntegrations.organizationId],
      references: [organizations.id],
    }),
    createdByUser: one(users, {
      fields: [slackIntegrations.createdByUserId],
      references: [users.id],
    }),
  })
);

export const granolaIntegrationsRelations = relations(
  granolaIntegrations,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [granolaIntegrations.organizationId],
      references: [organizations.id],
    }),
    createdByUser: one(users, {
      fields: [granolaIntegrations.createdByUserId],
      references: [users.id],
    }),
  })
);

export const mcpServerIntegrationsRelations = relations(
  mcpServerIntegrations,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [mcpServerIntegrations.organizationId],
      references: [organizations.id],
    }),
    createdByUser: one(users, {
      fields: [mcpServerIntegrations.createdByUserId],
      references: [users.id],
    }),
    oauthCredential: one(mcpOAuthCredentials, {
      fields: [mcpServerIntegrations.id],
      references: [mcpOAuthCredentials.serverIntegrationId],
    }),
    tools: many(mcpToolIndex),
  })
);

export const mcpOAuthCredentialsRelations = relations(
  mcpOAuthCredentials,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [mcpOAuthCredentials.organizationId],
      references: [organizations.id],
    }),
    connectedByUser: one(users, {
      fields: [mcpOAuthCredentials.connectedByUserId],
      references: [users.id],
    }),
    serverIntegration: one(mcpServerIntegrations, {
      fields: [mcpOAuthCredentials.serverIntegrationId],
      references: [mcpServerIntegrations.id],
    }),
  })
);

export const mcpOAuthPendingAuthorizationsRelations = relations(
  mcpOAuthPendingAuthorizations,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [mcpOAuthPendingAuthorizations.organizationId],
      references: [organizations.id],
    }),
    user: one(users, {
      fields: [mcpOAuthPendingAuthorizations.userId],
      references: [users.id],
    }),
    serverIntegration: one(mcpServerIntegrations, {
      fields: [mcpOAuthPendingAuthorizations.serverIntegrationId],
      references: [mcpServerIntegrations.id],
    }),
  })
);

export const mcpToolIndexRelations = relations(
  mcpToolIndex,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [mcpToolIndex.organizationId],
      references: [organizations.id],
    }),
    serverIntegration: one(mcpServerIntegrations, {
      fields: [mcpToolIndex.serverIntegrationId],
      references: [mcpServerIntegrations.id],
    }),
    activations: many(mcpSessionToolActivations),
  })
);

export const mcpSessionToolActivationsRelations = relations(
  mcpSessionToolActivations,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [mcpSessionToolActivations.organizationId],
      references: [organizations.id],
    }),
    tool: one(mcpToolIndex, {
      fields: [mcpSessionToolActivations.mcpToolIndexId],
      references: [mcpToolIndex.id],
    }),
  })
);

export const contentTriggersRelations = relations(
  contentTriggers,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [contentTriggers.organizationId],
      references: [organizations.id],
    }),
    lookbackWindow: one(contentTriggerLookbackWindows, {
      fields: [contentTriggers.id],
      references: [contentTriggerLookbackWindows.triggerId],
    }),
  })
);

export const contentTriggerLookbackWindowsRelations = relations(
  contentTriggerLookbackWindows,
  ({ one }) => ({
    trigger: one(contentTriggers, {
      fields: [contentTriggerLookbackWindows.triggerId],
      references: [contentTriggers.id],
    }),
  })
);

export const repositoryOutputsRelations = relations(
  repositoryOutputs,
  ({ one }) => ({
    integration: one(githubIntegrations, {
      fields: [repositoryOutputs.repositoryId],
      references: [githubIntegrations.id],
    }),
  })
);

export const brandSettingsRelations = relations(
  brandSettings,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [brandSettings.organizationId],
      references: [organizations.id],
    }),
    references: many(brandReferences),
    guidelines: many(brandGuidelines),
    sitemaps: many(brandSitemaps),
  })
);

export const brandReferencesRelations = relations(
  brandReferences,
  ({ one }) => ({
    brandSettings: one(brandSettings, {
      fields: [brandReferences.brandSettingsId],
      references: [brandSettings.id],
    }),
  })
);

export const brandGuidelinesRelations = relations(
  brandGuidelines,
  ({ one, many }) => ({
    brandSettings: one(brandSettings, {
      fields: [brandGuidelines.brandSettingsId],
      references: [brandSettings.id],
    }),
    assets: many(brandGuidelineAssets),
    colors: many(brandGuidelineColors),
    fonts: many(brandGuidelineFonts),
    screenshots: many(brandGuidelineScreenshots),
    tokens: many(brandGuidelineTokens),
  })
);

export const brandGuidelineColorsRelations = relations(
  brandGuidelineColors,
  ({ one }) => ({
    guideline: one(brandGuidelines, {
      fields: [brandGuidelineColors.guidelineId],
      references: [brandGuidelines.id],
    }),
  })
);

export const brandGuidelineFontsRelations = relations(
  brandGuidelineFonts,
  ({ one }) => ({
    guideline: one(brandGuidelines, {
      fields: [brandGuidelineFonts.guidelineId],
      references: [brandGuidelines.id],
    }),
  })
);

export const brandGuidelineTokensRelations = relations(
  brandGuidelineTokens,
  ({ one }) => ({
    guideline: one(brandGuidelines, {
      fields: [brandGuidelineTokens.guidelineId],
      references: [brandGuidelines.id],
    }),
  })
);

export const brandGuidelineAssetsRelations = relations(
  brandGuidelineAssets,
  ({ one }) => ({
    guideline: one(brandGuidelines, {
      fields: [brandGuidelineAssets.guidelineId],
      references: [brandGuidelines.id],
    }),
  })
);

export const brandGuidelineScreenshotsRelations = relations(
  brandGuidelineScreenshots,
  ({ one }) => ({
    guideline: one(brandGuidelines, {
      fields: [brandGuidelineScreenshots.guidelineId],
      references: [brandGuidelines.id],
    }),
  })
);

export const brandSitemapsRelations = relations(
  brandSitemaps,
  ({ one, many }) => ({
    brandSettings: one(brandSettings, {
      fields: [brandSitemaps.brandSettingsId],
      references: [brandSettings.id],
    }),
    pages: many(brandSitemapPages),
  })
);

export const brandSitemapPagesRelations = relations(
  brandSitemapPages,
  ({ one }) => ({
    sitemap: one(brandSitemaps, {
      fields: [brandSitemapPages.sitemapId],
      references: [brandSitemaps.id],
    }),
  })
);

export const connectedSocialAccountsRelations = relations(
  connectedSocialAccounts,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [connectedSocialAccounts.organizationId],
      references: [organizations.id],
    }),
  })
);

export const trackedSocialAccountsRelations = relations(
  trackedSocialAccounts,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [trackedSocialAccounts.organizationId],
      references: [organizations.id],
    }),
  })
);

export const organizationNotificationSettingsRelations = relations(
  organizationNotificationSettings,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationNotificationSettings.organizationId],
      references: [organizations.id],
    }),
  })
);

export const geoSettingsRelations = relations(geoSettings, ({ one }) => ({
  organization: one(organizations, {
    fields: [geoSettings.organizationId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [geoSettings.projectId],
    references: [projects.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.id],
  }),
  geoSettings: one(geoSettings),
  geoPrompts: many(geoPrompts),
  geoPromptSequences: many(geoPromptSequences),
  geoCompetitors: many(geoCompetitors),
  geoShelfSources: many(geoShelfSources),
  geoScans: many(geoScans),
  geoMentionChecks: many(geoMentionChecks),
  geoPersonas: many(geoPersonas),
  geoPersonaMemories: many(geoPersonaMemories),
  agentFeedback: many(agentFeedback),
}));

export const agentFeedbackRelations = relations(agentFeedback, ({ one }) => ({
  organization: one(organizations, {
    fields: [agentFeedback.organizationId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [agentFeedback.projectId],
    references: [projects.id],
  }),
}));

export const geoPromptSequencesRelations = relations(
  geoPromptSequences,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [geoPromptSequences.organizationId],
      references: [organizations.id],
    }),
    project: one(projects, {
      fields: [geoPromptSequences.projectId],
      references: [projects.id],
    }),
  })
);

export const socialExperimentsRelations = relations(
  socialExperiments,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [socialExperiments.organizationId],
      references: [organizations.id],
    }),
  })
);

export const geoPromptsRelations = relations(geoPrompts, ({ one }) => ({
  organization: one(organizations, {
    fields: [geoPrompts.organizationId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [geoPrompts.projectId],
    references: [projects.id],
  }),
}));

export const geoCompetitorsRelations = relations(geoCompetitors, ({ one }) => ({
  organization: one(organizations, {
    fields: [geoCompetitors.organizationId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [geoCompetitors.projectId],
    references: [projects.id],
  }),
}));

export const geoShelfSourcesRelations = relations(
  geoShelfSources,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [geoShelfSources.organizationId],
      references: [organizations.id],
    }),
    project: one(projects, {
      fields: [geoShelfSources.projectId],
      references: [projects.id],
    }),
    createdBy: one(users, {
      fields: [geoShelfSources.createdByUserId],
      references: [users.id],
    }),
  })
);

export const geoScansRelations = relations(geoScans, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [geoScans.organizationId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [geoScans.projectId],
    references: [projects.id],
  }),
  checks: many(geoMentionChecks),
}));

export const geoMentionChecksRelations = relations(
  geoMentionChecks,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [geoMentionChecks.organizationId],
      references: [organizations.id],
    }),
    project: one(projects, {
      fields: [geoMentionChecks.projectId],
      references: [projects.id],
    }),
    scan: one(geoScans, {
      fields: [geoMentionChecks.scanId],
      references: [geoScans.id],
    }),
    persona: one(geoPersonas, {
      fields: [geoMentionChecks.personaId],
      references: [geoPersonas.id],
    }),
  })
);

export const geoPersonasRelations = relations(geoPersonas, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [geoPersonas.organizationId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [geoPersonas.projectId],
    references: [projects.id],
  }),
  memories: many(geoPersonaMemories),
  mentionChecks: many(geoMentionChecks),
}));

export const geoPersonaMemoriesRelations = relations(
  geoPersonaMemories,
  ({ one }) => ({
    persona: one(geoPersonas, {
      fields: [geoPersonaMemories.personaId],
      references: [geoPersonas.id],
    }),
    organization: one(organizations, {
      fields: [geoPersonaMemories.organizationId],
      references: [organizations.id],
    }),
    project: one(projects, {
      fields: [geoPersonaMemories.projectId],
      references: [projects.id],
    }),
  })
);

export const geoPromptSuggestionsRelations = relations(
  geoPromptSuggestions,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [geoPromptSuggestions.organizationId],
      references: [organizations.id],
    }),
    acceptedPrompt: one(geoPrompts, {
      fields: [geoPromptSuggestions.acceptedPromptId],
      references: [geoPrompts.id],
    }),
  })
);

export const geoAgentReadinessReportsRelations = relations(
  geoAgentReadinessReports,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [geoAgentReadinessReports.organizationId],
      references: [organizations.id],
    }),
    project: one(projects, {
      fields: [geoAgentReadinessReports.projectId],
      references: [projects.id],
    }),
  })
);

export const googleSearchConsoleIntegrationsRelations = relations(
  googleSearchConsoleIntegrations,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [googleSearchConsoleIntegrations.organizationId],
      references: [organizations.id],
    }),
    createdByUser: one(users, {
      fields: [googleSearchConsoleIntegrations.createdByUserId],
      references: [users.id],
    }),
  })
);

export const postCollectionsRelations = relations(
  postCollections,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [postCollections.organizationId],
      references: [organizations.id],
    }),
    posts: many(posts),
  })
);

export const postsRelations = relations(posts, ({ many, one }) => ({
  organization: one(organizations, {
    fields: [posts.organizationId],
    references: [organizations.id],
  }),
  collection: one(postCollections, {
    fields: [posts.collectionId],
    references: [postCollections.id],
  }),
  chatSessions: many(chatSessions),
}));

export const skillsRelations = relations(skills, ({ one }) => ({
  organization: one(organizations, {
    fields: [skills.organizationId],
    references: [organizations.id],
  }),
}));

export const autonomyMandatesRelations = relations(
  autonomyMandates,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [autonomyMandates.organizationId],
      references: [organizations.id],
    }),
    createdByUser: one(users, {
      fields: [autonomyMandates.createdByUserId],
      references: [users.id],
    }),
    goals: many(autonomyGoals),
    runs: many(autonomyRuns),
  })
);

export const autonomySignalsRelations = relations(
  autonomySignals,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [autonomySignals.organizationId],
      references: [organizations.id],
    }),
    coalescedIntoSignal: one(autonomySignals, {
      fields: [autonomySignals.coalescedIntoSignalId],
      references: [autonomySignals.id],
      relationName: "autonomySignalCoalescing",
    }),
    coalescedSignals: many(autonomySignals, {
      relationName: "autonomySignalCoalescing",
    }),
  })
);

export const autonomyGoalsRelations = relations(
  autonomyGoals,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [autonomyGoals.organizationId],
      references: [organizations.id],
    }),
    mandate: one(autonomyMandates, {
      fields: [autonomyGoals.mandateId],
      references: [autonomyMandates.id],
    }),
    runs: many(autonomyRuns),
    tasks: many(autonomyTasks),
  })
);

export const autonomyRunsRelations = relations(
  autonomyRuns,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [autonomyRuns.organizationId],
      references: [organizations.id],
    }),
    mandate: one(autonomyMandates, {
      fields: [autonomyRuns.mandateId],
      references: [autonomyMandates.id],
    }),
    goal: one(autonomyGoals, {
      fields: [autonomyRuns.goalId],
      references: [autonomyGoals.id],
    }),
    tasks: many(autonomyTasks),
    actions: many(autonomyActions),
    checkpoints: many(autonomyCheckpoints),
    outboxMessages: many(autonomyOutbox),
  })
);

export const autonomyTasksRelations = relations(
  autonomyTasks,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [autonomyTasks.organizationId],
      references: [organizations.id],
    }),
    goal: one(autonomyGoals, {
      fields: [autonomyTasks.goalId],
      references: [autonomyGoals.id],
    }),
    run: one(autonomyRuns, {
      fields: [autonomyTasks.runId],
      references: [autonomyRuns.id],
    }),
    actions: many(autonomyActions),
    checkpoints: many(autonomyCheckpoints),
  })
);

export const autonomyActionsRelations = relations(
  autonomyActions,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [autonomyActions.organizationId],
      references: [organizations.id],
    }),
    run: one(autonomyRuns, {
      fields: [autonomyActions.runId],
      references: [autonomyRuns.id],
    }),
    task: one(autonomyTasks, {
      fields: [autonomyActions.taskId],
      references: [autonomyTasks.id],
    }),
  })
);

export const autonomyCheckpointsRelations = relations(
  autonomyCheckpoints,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [autonomyCheckpoints.organizationId],
      references: [organizations.id],
    }),
    run: one(autonomyRuns, {
      fields: [autonomyCheckpoints.runId],
      references: [autonomyRuns.id],
    }),
    task: one(autonomyTasks, {
      fields: [autonomyCheckpoints.taskId],
      references: [autonomyTasks.id],
    }),
  })
);

export const autonomyOutboxRelations = relations(autonomyOutbox, ({ one }) => ({
  organization: one(organizations, {
    fields: [autonomyOutbox.organizationId],
    references: [organizations.id],
  }),
  run: one(autonomyRuns, {
    fields: [autonomyOutbox.runId],
    references: [autonomyRuns.id],
  }),
}));

export const autonomyClaimsRelations = relations(autonomyClaims, ({ one }) => ({
  organization: one(organizations, {
    fields: [autonomyClaims.organizationId],
    references: [organizations.id],
  }),
}));

export const autonomyControllerLeasesRelations = relations(
  autonomyControllerLeases,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [autonomyControllerLeases.organizationId],
      references: [organizations.id],
    }),
  })
);

export const geoProspectReportsRelations = relations(
  geoProspectReports,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [geoProspectReports.organizationId],
      references: [organizations.id],
    }),
    createdBy: one(users, {
      fields: [geoProspectReports.createdByUserId],
      references: [users.id],
    }),
  })
);
