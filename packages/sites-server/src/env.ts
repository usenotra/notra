import { SitesNotConfiguredError } from "./errors";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new SitesNotConfiguredError(`${name} is not set`);
  }
  return value;
}

export function getSitesR2Env() {
  return {
    accountId: required("SITES_R2_ACCOUNT_ID"),
    accessKeyId: required("SITES_R2_ACCESS_KEY_ID"),
    secretAccessKey: required("SITES_R2_SECRET_ACCESS_KEY"),
    bucket: required("SITES_R2_BUCKET"),
  };
}

export function getSitesHostingDomain(): string {
  return required("SITES_HOSTING_DOMAIN").toLowerCase();
}

export function getSitesHostingProtocol(): "http" | "https" {
  return process.env.SITES_HOSTING_PROTOCOL?.trim() === "http"
    ? "http"
    : "https";
}

export function getSitesHostingPortSuffix(): string {
  const port = process.env.SITES_HOSTING_PORT?.trim();
  return port ? `:${port}` : "";
}

export function siteCnameTarget(): string {
  return (
    process.env.SITES_CNAME_TARGET?.trim() || `cname.${getSitesHostingDomain()}`
  );
}

export function getSitesPreviewSecret(): string {
  return required("SITES_PREVIEW_SECRET");
}

export function getSitesBuilderSnapshotId(): string {
  return required("SITES_BUILDER_SNAPSHOT_ID");
}

export function getBoxApiKey(): string {
  return required("UPSTASH_BOX_API_KEY");
}

export function getDashboardUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    "http://localhost:3000"
  ).replace(/\/+$/, "");
}

export function isSitesConfigured(): boolean {
  try {
    getSitesR2Env();
    getSitesHostingDomain();
    getSitesPreviewSecret();
    getSitesBuilderSnapshotId();
    getBoxApiKey();
    return true;
  } catch {
    return false;
  }
}
