export const QUERY_KEYS = {
  AUTH: {
    session: ["auth", "session"],
    organizations: ["auth", "organizations"],
    activeOrganization: ["auth", "activeOrganization"],
  },
  INTEGRATIONS: {
    base: ["integrations"] as const,
    all: (organizationId: string) => ["integrations", organizationId] as const,
    detail: (integrationId: string) => ["integrations", integrationId] as const,
    repositories: (integrationId: string) =>
      ["integrations", integrationId, "repositories"] as const,
    availableRepos: (integrationId: string) =>
      ["integrations", integrationId, "available-repos"] as const,
  },
  BRAND: {
    settings: (organizationId: string) =>
      ["brand", "settings", organizationId] as const,
    progress: (organizationId: string) =>
      ["brand", "progress", organizationId] as const,
  },
  WEBHOOK_LOGS: {
    base: ["webhook-logs"] as const,
    list: (organizationId: string, page: number) =>
      ["webhook-logs", organizationId, page] as const,
  },
} as const;
