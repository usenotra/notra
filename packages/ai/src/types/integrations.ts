export interface ErrorWithStatus {
  status?: number;
}

export type GitHubOrgMembershipCheck =
  | { verified: true; isAdmin: boolean }
  | { verified: false };

export interface ValidateRepositoryBranchExistsParams {
  owner: string;
  repo: string;
  branch: string;
  token?: string | null;
  encryptedToken?: string | null;
}

export interface CreateGitHubIntegrationParams {
  organizationId: string;
  userId: string;
  token: string | null;
  displayName: string;
  owner: string;
  repo: string;
  defaultBranch: string | null;
}

export interface AddRepositoryParams {
  integrationId: string;
  owner: string;
  repo: string;
  outputs?: Array<{
    type: string;
    enabled?: boolean;
    config?: Record<string, unknown>;
  }>;
}

export type RepositoryOutputType =
  | "changelog"
  | "blog_post"
  | "twitter_post"
  | "linkedin_post"
  | "investor_update"
  | "image";

export interface ConfigureOutputParams {
  repositoryId: string;
  outputType: RepositoryOutputType;
  enabled: boolean;
  config?: Record<string, unknown> | null;
}

export interface SetRepositoryOutputConfigParams {
  contentPath?: string | null;
  directory?: string;
  imagePath?: string | null;
  outputType: RepositoryOutputType;
  repositoryId: string;
}

export interface WebhookConfig {
  webhookUrl: string;
  webhookSecret: string;
  repositoryId: string;
  owner: string;
  repo: string;
}

export interface CreateLinearIntegrationParams {
  organizationId: string;
  userId: string;
  displayName: string;
  accessToken: string;
  linearOrganizationId: string;
  linearOrganizationName?: string;
  linearTeamId?: string;
  linearTeamName?: string;
}

export interface CreateSlackIntegrationParams {
  organizationId: string;
  userId: string;
  displayName: string;
  botToken: string;
  slackTeamId: string;
  slackTeamName?: string;
  slackBotUserId?: string;
}

export interface UpdateSlackIntegrationParams {
  organizationId: string;
  integrationId: string;
  displayName?: string;
  allowedChannelIds?: string[] | null;
  notificationChannelId?: string | null;
  enabled?: boolean;
}

export interface CreateGranolaIntegrationParams {
  organizationId: string;
  userId: string;
  displayName: string;
  apiKey: string;
  workspaceName?: string;
}

export interface UpdateGranolaIntegrationParams {
  displayName?: string;
  enabled?: boolean;
  workspaceName?: string | null;
}

export interface GranolaKeyVerificationResult {
  valid: boolean;
  error?: string;
}

export interface McpHeaderMap {
  [key: string]: string;
}

export type McpStoreStatus = "draft" | "pending_review" | "live" | "rejected";

export type McpIntegrationResourceType = "connection" | "store_listing";

export interface McpServerIntegrationSerializationInput {
  id: string;
  name: string;
  url: string;
  description: string | null;
  resourceType?: McpIntegrationResourceType;
  author?: string | null;
  websiteUrl?: string | null;
  brandColor?: string | null;
  logoLightUrl?: string | null;
  logoDarkUrl?: string | null;
  bannerUrl?: string | null;
  slug?: string | null;
  storeSourceIntegrationId?: string | null;
  storeStatus?: string;
  reviewNote?: string | null;
  submittedAt?: Date | null;
  reviewedAt?: Date | null;
  authType: string;
  encryptedHeaders: McpHeaderMap;
  enabled: boolean;
  lastToolSyncAt?: Date | null;
  toolSyncStatus?: string;
  toolSyncError?: string | null;
  indexedToolCount?: number;
  oauthCredential?: {
    status: string;
  } | null;
  createdAt: Date;
  updatedAt?: Date | null;
  createdByUser?: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  } | null;
}

export interface CreateMcpServerIntegrationParams {
  authType: "none" | "headers" | "oauth";
  organizationId: string;
  userId: string;
  name: string;
  url: string;
  description?: string | null;
  author?: string | null;
  websiteUrl?: string | null;
  brandColor?: string | null;
  logoLightUrl?: string | null;
  logoDarkUrl?: string | null;
  bannerUrl?: string | null;
  slug?: string | null;
  storeSourceIntegrationId?: string | null;
  headers?: McpHeaderMap;
}

export interface McpServerIntegrationScope {
  integrationId: string;
  organizationId: string;
}

export interface McpTypedServerIntegrationScope extends McpServerIntegrationScope {
  resourceType: McpIntegrationResourceType;
}

export interface UpdateMcpServerIntegrationParams {
  authType?: "none" | "headers" | "oauth";
  name?: string;
  url?: string;
  description?: string | null;
  author?: string | null;
  websiteUrl?: string | null;
  brandColor?: string | null;
  logoLightUrl?: string | null;
  logoDarkUrl?: string | null;
  bannerUrl?: string | null;
  slug?: string | null;
  headers?: McpHeaderMap;
  enabled?: boolean;
}

export type McpBrandingAssetKind = "logo-light" | "logo-dark" | "banner";

export interface UploadIntegrationBrandingAssetParams {
  organizationId: string;
  kind: McpBrandingAssetKind;
  body: Buffer;
  contentType: string;
  extension: string;
}

export interface McpToolActionPhraseUpdate {
  serverToolName: string;
  actionPhrasePresent: string | null;
  actionPhrasePast: string | null;
}
