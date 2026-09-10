export const QUERY_KEYS = {
  AUTH: {
    session: ["auth", "session"],
    organizations: ["auth", "organizations"],
    activeOrganization: ["auth", "activeOrganization"],
    // Deliberately nested under `activeOrganization` so the existing
    // `invalidateQueries({ queryKey: AUTH.activeOrganization })` call sites
    // reach the per-slug summaries by prefix. Keep the first two segments.
    organizationSummary: (slug: string) =>
      ["auth", "activeOrganization", "summary", slug] as const,
  },
  INTEGRATIONS: {
    base: ["integrations"] as const,
    all: (organizationId: string) => ["integrations", organizationId] as const,
    detail: (organizationId: string, integrationId: string) =>
      ["integrations", organizationId, "detail", integrationId] as const,
    repositories: (integrationId: string) =>
      ["integrations", integrationId, "repositories"] as const,
    availableRepos: (integrationId: string) =>
      ["integrations", integrationId, "available-repos"] as const,
    webhookConfig: (repositoryId: string) =>
      ["integrations", "webhook", repositoryId] as const,
  },
  CONNECTED_ACCOUNTS: {
    list: (organizationId: string) =>
      ["connected-accounts", organizationId] as const,
  },
  BRAND: {
    settings: (organizationId: string) =>
      ["brand", "settings", organizationId] as const,
    progress: (organizationId: string) =>
      ["brand", "progress", organizationId] as const,
    references: (organizationId: string, voiceId: string) =>
      ["brand", "references", organizationId, voiceId] as const,
  },
  WEBHOOK_LOGS: {
    base: ["webhook-logs"] as const,
    list: (organizationId: string, page: number) =>
      ["webhook-logs", organizationId, page] as const,
  },
  TRIGGERS: {
    base: ["triggers"] as const,
    list: (organizationId: string) => ["triggers", organizationId] as const,
  },
  AUTOMATION: {
    base: ["automation"] as const,
    events: (organizationId: string) =>
      ["automation", "events", organizationId] as const,
    schedules: (organizationId: string) =>
      ["automation", "schedules", organizationId] as const,
  },
  CONTENT: {
    base: ["content"] as const,
    detail: (organizationId: string, contentId: string) =>
      ["content", organizationId, contentId] as const,
  },
  POSTS: {
    base: ["posts"] as const,
    list: (organizationId: string) => ["posts", organizationId] as const,
    metrics: (organizationId: string) =>
      ["posts", organizationId, "metrics"] as const,
    today: (organizationId: string) =>
      ["posts", organizationId, "today"] as const,
  },
  ACTIVE_GENERATIONS: {
    list: (organizationId: string) =>
      ["active-generations", organizationId] as const,
  },
  NOTIFICATION_SETTINGS: {
    settings: (organizationId: string) =>
      ["notification-settings", organizationId] as const,
  },
  ONBOARDING: {
    status: (organizationId: string) => ["onboarding", organizationId] as const,
  },
  API_KEYS: {
    base: ["api-keys"] as const,
    list: (organizationId: string) => ["api-keys", organizationId] as const,
  },
} as const;
