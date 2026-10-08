import type { CloudflareSaasConfig } from "../../src/types/cloudflare-saas";
import type { SiteRepository } from "../../src/types/github";

export const githubRepository: SiteRepository = {
  organizationId: "synthetic-org",
  integrationId: "synthetic-integration",
  githubRepositoryId: "synthetic-repo",
  installationId: "synthetic-installation",
  owner: "synthetic-owner",
  repo: "synthetic-repository",
};

export const cloudflareConfig: CloudflareSaasConfig = {
  zoneId: "synthetic-zone",
  apiToken: "synthetic-provider-token",
};

export const cloudflareHostname = {
  id: "cf-hostname",
  hostname: "blog.example.com",
  status: "pending",
};

export const domainConnectSettings = {
  providerId: "provider.example",
  providerName: "Synthetic DNS provider",
  urlAPI: "https://provider.example/api",
  urlSyncUX: "https://provider.example/sync",
};
