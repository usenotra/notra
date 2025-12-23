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
} as const;
