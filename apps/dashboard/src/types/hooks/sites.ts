import type { dashboardOrpc } from "@/lib/orpc/query";
import type { SiteDiagnostic, SiteDomain, SiteScope } from "@/types/sites";

export interface SitePollingQuery<TData> {
  state: { data?: TData };
}

export interface UseSiteDeploymentParams extends SiteScope {
  deploymentId: string;
}

export interface UseSiteDomainCheckParams extends SiteScope {
  domainId: string;
}

export interface UseSiteDomainConnectParams extends SiteScope {
  domain: SiteDomain;
}

export interface UseRebaseSiteDraftsParams extends SiteScope {
  onRebased: () => void;
}

export interface UseValidateSiteDraftsParams extends SiteScope {
  onValidated: (diagnostics: SiteDiagnostic[]) => void;
}

export interface UseCreateSiteFileParams extends SiteScope {
  baseCommitSha: string | null;
  sourceContext: Parameters<
    typeof dashboardOrpc.sites.editor.saveDraft.call
  >[0]["sourceContext"];
  refreshDrafts: () => Promise<void>;
  onSaved: () => void;
  onCreated: (path: string) => void;
}

export interface UseSavePreviewAccessParams extends SiteScope {
  onSaved: () => void;
}

export interface SaveSiteIntegrationInput {
  provider: Parameters<
    typeof dashboardOrpc.sites.integrations.save.call
  >[0]["provider"];
  settings: Record<string, unknown> | null;
}

export interface SiteAnalyticsWindow {
  days?: number;
  from?: string;
  to?: string;
}
