import type { sites } from "@notra/db/schema";
import type { SiteMounts } from "@notra/sites-core/types/deployment";

export type Site = typeof sites.$inferSelect;

export type SiteInputField =
  | "repository"
  | "name"
  | "slug"
  | "rootDirectory"
  | "sections";

export interface SiteNameRejection {
  message: string;
  field: "name" | "slug";
}

export interface SiteNameRejectionParams {
  organizationId: string;
  userId: string;
  name: string;
  address: string;
  slug?: string;
}

export type SiteUpdateValues = Partial<typeof sites.$inferInsert>;

export interface CreateSiteInput {
  organizationId: string;
  userId: string;
  projectId?: string | null;
  name: string;
  slug?: string;
  repositoryId: string;
  productionBranch?: string;
  rootDirectory?: string;
  mounts?: SiteMounts;
  previewVisibility?: Site["previewVisibility"];
  publishMode?: Site["publishMode"];
}

export interface RepositorySuggestionsParams {
  organizationId: string;
  repositoryId: string;
  ref: string | null;
}

export interface DeployBranchHeadOptions {
  trigger: "manual" | "config" | "redeploy";
  userId?: string | null;
  branch?: string;
  previewKey?: string | null;
}

export interface SiteSettingsPatch {
  name?: string;
  productionBranch?: string;
  rootDirectory?: string;
  mounts?: SiteMounts;
  previewsEnabled?: boolean;
  smartDeployments?: boolean;
  previewCommentsEnabled?: boolean;
  previewVisibility?: Site["previewVisibility"];
  publishMode?: Site["publishMode"];
  showBranding?: boolean;
  analyticsEnabled?: boolean;
  previewPassword?: string | null;
  publicOrigin?: string;
}

export interface CreateSiteResult {
  site: Site;
  jobId: string | null;
}

export interface BranchPreviewResult {
  jobId: string;
  previewKey: string;
}

export interface UpdateSiteSettingsResult {
  site: Site;
  syncJobId: string;
  rebuilding: boolean;
}

export interface SiteCleanupResult {
  deleted: string[];
}
