import type { IconSvgElement } from "@hugeicons/react";
import type { SITE_DEPLOYMENT_STATUSES } from "@notra/sites-core/constants/sites";
import type { RepositoryContentCount } from "@notra/sites-server/types/github";
import type { SiteInputField } from "@notra/sites-server/types/sites";
import type { InferRouterInputs, InferRouterOutputs } from "@orpc/server";
import type { ReactNode } from "react";

import type { SITE_CREATE_STEP_IDS } from "@/constants/site-create";
import type {
  SITE_DETAIL_TABS,
  SITE_DOMAIN_CONNECT_OUTCOMES,
  SITE_NEW_FILE_FOLDERS,
  SITE_PROXY_RECIPES,
} from "@/constants/sites";
import type { DashboardRouter } from "@/lib/orpc/router";

type SitesOutputs = InferRouterOutputs<DashboardRouter>["sites"];
type SitesInputs = InferRouterInputs<DashboardRouter>["sites"];

export type SiteCreateInput = SitesInputs["create"];

export type SiteListResult = SitesOutputs["list"];
export type SiteListItem = SiteListResult["sites"][number];
export type SiteDetail = SitesOutputs["get"];
export type SiteRecord = SiteDetail["site"];
export type SiteDeployment = SiteDetail["deployments"][number];
export type SiteDeploymentDetail = SitesOutputs["deployments"]["get"];
export type SiteDeploymentRecord = SiteDeploymentDetail["deployment"];
type SitePreview = SiteDetail["previews"][number];
export type SiteDomain = SiteDetail["domains"][number];
export type SiteRepository = SitesOutputs["connectRepository"];
export type SiteCreateStepId = (typeof SITE_CREATE_STEP_IDS)[number];
export type SiteImportableRepository =
  SitesOutputs["importableRepositories"]["repositories"][number];
type SiteEditorFiles = SitesOutputs["editor"]["files"];
export type SiteEditorFile = SiteEditorFiles["files"][number];
export type SiteEditorDraft = SiteEditorFiles["drafts"][number];
export type SiteEditorDocument = SitesOutputs["editor"]["read"];
export type SiteDiagnostic = SiteDeploymentRecord["diagnostics"][number];

export type SiteDeploymentStatus = (typeof SITE_DEPLOYMENT_STATUSES)[number];
export type SiteSection = (typeof SITE_DETAIL_TABS)[number];

export interface SiteSectionConfig {
  section: SiteSection;
  path: string;
  icon: IconSvgElement;
}
export type SiteNewFileFolder = (typeof SITE_NEW_FILE_FOLDERS)[number];
export type SiteProxyRecipeId = (typeof SITE_PROXY_RECIPES)[number];
export type SitePreviewVisibility = SiteRecord["previewVisibility"];
export type SitePublishMode = SiteRecord["publishMode"];
export type SiteMounts = SiteRecord["mounts"];
export type SiteDomainKind = SiteDomain["kind"];

export interface SiteRepositoryRef {
  owner: string;
  name: string;
}

export interface SiteProxyRecipe {
  id: SiteProxyRecipeId;
  filename: string;
  code: string;
}

export interface SitesPageClientProps {
  organizationSlug: string;
}

export interface SiteDomainConnectRouteContext {
  params: Promise<{ token: string }>;
}

export interface SiteScope {
  organizationId: string;
  siteId: string;
}

export interface SiteContextValue {
  organizationId: string;
  organizationSlug: string;
  siteId: string;
  detail: SiteDetail;
  liveDeployment: SiteDeployment | null;
}

export interface SitePreviewRow extends Omit<
  SitePreview,
  "visibility" | "activatedAt"
> {
  visibility: SitePreview["visibility"] | null;
  activatedAt: SitePreview["activatedAt"] | null;
  served: boolean;
  status: SiteDeploymentStatus;
  latestDeploymentId: string;
  updatedAt: Date | string;
}

export interface SiteSettingsForm {
  name: string;
  productionBranch: string;
  rootDirectory: string;
  blogEnabled: boolean;
  blogPath: string;
  changelogEnabled: boolean;
  changelogPath: string;
  publishMode: SitePublishMode;
  previewCommentsEnabled: boolean;
}

export interface SiteCreateFormValues {
  repositoryId: string | null;
  name: string;
  slug: string;
  branch: string;
  rootDirectory: string;
  blogPath: string | null;
  changelogPath: string | null;
  previewVisibility: SitePreviewVisibility;
  publishMode: SitePublishMode;
}

export type SiteCreateFieldErrors = Partial<Record<SiteInputField, string>>;

export interface SiteCreateTarget {
  organizationId: string;
  repositoryId: string;
  projectId: string | null;
}

export interface SiteSettingsPatch {
  name?: string;
  productionBranch?: string;
  rootDirectory?: string;
  mounts?: { blog?: string; changelog?: string };
  publishMode?: SitePublishMode;
  previewCommentsEnabled?: boolean;
}

export type SiteDomainRecord = SiteDomain["records"][number];
export type SiteDomainConnectOutcome =
  (typeof SITE_DOMAIN_CONNECT_OUTCOMES)[number];
export type SiteDomainChipStatus =
  | "active"
  | "dnsRequired"
  | "proxyRequired"
  | "verifying"
  | "failed";

export type SiteDomainRow =
  | { id: string; kind: "alias"; isPrimary: boolean }
  | { id: string; kind: "domain"; domain: SiteDomain };

export interface SiteChoiceOption<T extends string> {
  value: T;
  title: string;
  description: string;
  badge?: string;
  disabled?: boolean;
}

export type SiteBuildLogTone =
  | "default"
  | "muted"
  | "success"
  | "warning"
  | "error";

export interface SiteBuildLogLine {
  number: number;
  timestamp: string | null;
  text: string;
  tone: SiteBuildLogTone;
  continued: boolean;
}

export type SiteBuildLogEntry =
  | { kind: "line"; line: SiteBuildLogLine }
  | {
      kind: "fold";
      id: string;
      lines: SiteBuildLogLine[];
      tone: SiteBuildLogTone;
    };

export type SiteBuildLogFold = Extract<SiteBuildLogEntry, { kind: "fold" }>;

export interface SiteBuildLogTagParts {
  tag: string | null;
  rest: string;
}

export type SiteDeploymentKind = SiteDeployment["kind"];
export type SiteDeploymentTrigger = SiteDeployment["trigger"];
export type SiteDeploymentStatusFilter =
  | "ready"
  | "building"
  | "queued"
  | "failed"
  | "canceled"
  | "superseded"
  | "expired";

export type SiteDeploymentEnvironmentFilter = SiteDeploymentKind | "all";

export interface SiteDeploymentFilters {
  environment: SiteDeploymentEnvironmentFilter;
  status: SiteDeploymentStatusFilter | "all";
}

export interface SiteCreateSectionPlan {
  blogPath: string;
  changelogPath: string;
  counts: RepositoryContentCount | null;
}

export interface RepositorySuggestionsResult {
  branches: string[];
  defaultBranch: string | null;
  configDirectories: string[];
  contentCounts: Record<string, RepositoryContentCount> | undefined;
  isLoading: boolean;
}

export type RepositorySuggestionsScope =
  | { organizationId: string; repositoryId: string | null; branch: string }
  | { organizationId: string; siteId: string; branch: string };

export interface SiteStarterInput {
  organizationId: string;
  repositoryId: string;
  branch: string;
  rootDirectory: string;
}
