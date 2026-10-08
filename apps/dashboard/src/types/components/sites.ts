import type { IconSvgElement } from "@hugeicons/react";
import type { ReactNode } from "react";

import type { SiteIntegrationProvider } from "@/types/site-integrations";
import type {
  RepositorySuggestionsResult,
  SiteBuildLogEntry,
  SiteBuildLogFold,
  SiteBuildLogLine,
  SiteChoiceOption,
  SiteCreateFieldErrors,
  SiteCreateFormValues,
  SiteCreateSectionPlan,
  SiteCreateStepId,
  SiteDeployment,
  SiteDeploymentRecord,
  SiteDeploymentStatus,
  SiteDetail,
  SiteDomain,
  SiteDomainChipStatus,
  SiteDomainRecord,
  SiteImportableRepository,
  SiteEditorDraft,
  SiteListItem,
  SiteMounts,
  SiteNewFileFolder,
  SitePreviewRow,
  SitePreviewVisibility,
  SitePublishMode,
  SiteRecord,
  SiteRepository,
  SiteScope,
  SiteSection,
} from "@/types/sites";

export interface SitesPageShellProps {
  children: ReactNode;
}

export interface SiteDeploymentTimelineProps {
  deployment: SiteDeploymentRecord;
  log: string | null;
}

export interface SiteLayoutProps {
  organizationSlug: string;
  siteId: string;
  children: ReactNode;
}

export interface SiteRepositoryHoverCardProps {
  organizationId: string;
  siteId: string;
  owner: string;
  name: string;
  branch: string;
}

export interface SitesTableProps {
  organizationId: string;
  organizationSlug: string;
  sites: SiteListItem[];
}

export interface SiteCreateFormProps {
  organizationId: string;
  organizationSlug: string;
  hostingDomain: string | null;
}

export interface SiteCreateSourceFieldsProps {
  idPrefix: string;
  organizationId: string;
  hostingDomain: string | null;
  form: SiteCreateFormValues;
  onChange: <K extends keyof SiteCreateFormValues>(
    key: K,
    value: SiteCreateFormValues[K]
  ) => void;
  repository: SiteRepository | null;
  slugInvalid: boolean;
  errors: SiteCreateFieldErrors;
  starterPullRequestUrl: string | null;
  onStarterPullRequestOpened: (url: string) => void;
  suggestions: RepositorySuggestionsResult;
  sections: SiteCreateSectionPlan;
}

export interface SiteCreateSectionFieldsProps {
  idPrefix: string;
  plan: SiteCreateSectionPlan;
  onBlogPathChange: (value: string) => void;
  onChangelogPathChange: (value: string) => void;
  error?: string;
}

export interface SiteAddressInputProps {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  invalid: boolean;
  placeholder: string;
  hostingDomain: string | null;
  describedBy?: string;
}

export interface SiteSectionsFieldsProps {
  idPrefix: string;
  blogEnabled: boolean;
  changelogEnabled: boolean;
  blogPath: string;
  changelogPath: string;
  onBlogEnabledChange: (value: boolean) => void;
  onChangelogEnabledChange: (value: boolean) => void;
  onBlogPathChange: (value: string) => void;
  onChangelogPathChange: (value: string) => void;
}

export interface SiteSectionRowProps {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  path: string;
  onEnabledChange: (value: boolean) => void;
  onPathChange: (value: string) => void;
}

export interface SiteChoiceGroupProps<T extends string> {
  label: string;
  value: T;
  options: SiteChoiceOption<T>[];
  onValueChange: (value: T) => void;
  disabled?: boolean;
  hideLabel?: boolean;
}

export interface SiteSettingsRowProps {
  label: string;
  htmlFor?: string;
  description?: ReactNode;
  children: ReactNode;
}

export interface SiteDeleteDialogProps extends SiteScope {
  organizationSlug: string;
  siteName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface SiteMetaProps {
  icon: IconSvgElement;
  children: ReactNode;
  mono?: boolean;
  className?: string;
}

export interface SiteRelativeTimeProps {
  date: Date | string;
  className?: string;
  inline?: boolean;
}

export interface SiteStatusDotProps {
  status: SiteDeploymentStatus;
  live?: boolean;
  duration?: string | null;
  className?: string;
}

export interface SitePreviewFrameProps {
  url: string | null;
  className?: string;
  fallback?: ReactNode;
}

export interface SiteTopbarTitleProps {
  siteId: string;
  href: string | null;
}

export interface DeploymentTopbarTitleProps {
  siteId: string;
  deploymentId: string;
}

export interface SiteSectionTopbarTitleProps {
  section: SiteSection;
  href: string | null;
}

export interface SiteOverviewInfoRowProps {
  icon: IconSvgElement;
  label: string;
  children: ReactNode;
}

export interface SiteOverviewExternalLinkProps {
  href: string;
  children: ReactNode;
  muted?: boolean;
}

export interface SitePendingProductionProps {
  deployment: SiteDeployment;
}

export interface SiteOverviewStatusProps {
  pendingProduction: SiteDeployment | null;
  suspended: boolean;
  live: boolean;
}

export interface SiteOverviewPreviewProps {
  url: string | null;
  suspended: boolean;
  firstBuild: boolean;
  live: boolean;
}

export interface SiteOverviewDomainsProps {
  domains: SiteDomain[];
  aliasUrl: string;
}

export interface SiteViewAllLinkProps {
  href: string;
  label: string;
}

export interface SiteUpdatedLineProps {
  deployment: SiteDeployment | null;
}

export interface SiteBuildLogHighlightProps {
  text: string;
  query: string;
}

export interface SiteBuildLogLineTextProps {
  line: SiteBuildLogLine;
  query: string;
}

export interface SiteBuildLogLineProps {
  line: SiteBuildLogLine;
  offset: string | undefined;
  query: string;
}

export interface SiteBuildLogFoldRowProps {
  entry: SiteBuildLogFold;
  offsets: Map<number, string>;
}

export interface SiteBuildLogRowsProps {
  entries: SiteBuildLogEntry[];
  matchingLines: SiteBuildLogLine[];
  offsets: Map<number, string>;
  query: string;
}

export interface SiteBuildLogFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export interface SiteBuildLogSummaryProps {
  lines: SiteBuildLogLine[];
  inProgress: boolean;
}

export interface SiteBuildLogEmptyProps {
  inProgress: boolean;
  queued: boolean;
  showSpinner?: boolean;
}

export interface SiteBuildLogCopyButtonProps {
  log: string | null;
}

export interface SiteBuildLogsProps {
  log: string | null;
  heading?: ReactNode;
  inProgress: boolean;
  queued: boolean;
  startAtEnd?: boolean;
}

export interface SiteDeploymentMenuProps {
  deployment: Pick<
    SiteDeploymentRecord,
    "id" | "kind" | "live" | "status" | "url" | "commitSha"
  >;
  canRollback: boolean;
  detailHref?: string;
  redeployPending: boolean;
  onRedeploy: () => void;
  onRollback: () => void;
  preview?: SitePreviewRow;
  onOpenPreview?: () => void;
  onCopyShareLink?: () => void;
  onDeletePreview?: () => void;
}

export interface SiteDeploymentsTableProps {
  organizationId: string;
  organizationSlug: string;
  siteId: string;
  deployments: SiteDeployment[];
  emptyState?: ReactNode;
  withActions?: boolean;
  highlightNewRows?: boolean;
  emptyHeight?: number;
  pageSize: number;
  previewRows?: SitePreviewRow[];
}

export interface SiteDeploymentDetailPageProps {
  deploymentId: string;
}

export interface SiteDeploymentDetailProps extends SiteScope {
  detail: SiteDetail;
  deployment: SiteDeploymentRecord;
  log: string | null;
}

export interface SiteDeploymentActionsProps extends SiteScope {
  deployment: SiteDeploymentRecord;
  live: boolean;
  primaryUrl: string;
  rollbackEntry: SiteDeployment | null;
  onRollback: () => void;
}

export interface SiteEnvironmentBadgeProps {
  kind: SiteDeployment["kind"];
  previewKey: string | null;
  live: boolean;
  className?: string;
}

export interface SiteDeploymentSummaryProps {
  detail: SiteDetail;
  deployment: SiteDeploymentRecord;
  live: boolean;
  urls: string[];
  primaryUrl: string;
}

export interface SiteDeploymentFactProps {
  label: string;
  children: ReactNode;
}

export interface SiteDeploymentExternalLinkProps {
  href: string | null;
  children: ReactNode;
  mono?: boolean;
}

export interface SiteDeploymentRecordProps {
  deployment: SiteDeploymentRecord;
}

export interface SiteRollbackDialogProps extends SiteScope {
  deployment: SiteDeployment | null;
  onOpenChange: (open: boolean) => void;
}

export interface SitePreviewsTableProps extends SiteScope {
  organizationSlug: string;
  rows: SitePreviewRow[];
  repository: SiteRecord["repository"];
  compact?: boolean;
  emptyState?: ReactNode;
}

export interface SitePreviewRowMenuProps {
  row: SitePreviewRow;
  onCopyShareLink: () => void;
  onViewDeployment: () => void;
  onDelete: () => void;
}

export interface SitePreviewDeleteDialogProps extends SiteScope {
  preview: SitePreviewRow | null;
  onOpenChange: (open: boolean) => void;
}

export interface SiteOpenPreviewButtonProps {
  label: string;
  tooltip: string;
  disabled: boolean;
  onOpen: () => void;
}

export interface SitePreviewBranchDialogProps extends SiteScope {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface SiteSettingsFormProps extends SiteScope {
  organizationSlug: string;
  detail: SiteDetail;
}

export interface SiteSettingsDangerZoneProps extends SiteScope {
  organizationSlug: string;
  site: SiteRecord;
}

export interface SiteSettingsSaveBarProps {
  canSave: boolean;
  isSaving: boolean;
  onReset: () => void;
}

export interface SitePublishDialogProps extends SiteScope {
  unsaved?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site: SiteRecord;
  draftCount: number;
  drafts: SiteEditorDraft[];
  sourcePaths: ReadonlySet<string>;
  onPublished: () => void;
  onConflict: (paths: string[]) => void;
}

export interface SiteNewFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingPaths: ReadonlySet<string>;
  folders: readonly SiteNewFileFolder[];
  isCreating: boolean;
  onCreate: (path: string, content: string) => void;
}

export interface SiteNewFileFolderTabsProps {
  folders: readonly SiteNewFileFolder[];
  value: SiteNewFileFolder;
  onValueChange: (folder: SiteNewFileFolder) => void;
}

export interface SiteNewFileNameFieldProps {
  id: string;
  folder: SiteNewFileFolder;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  slug: string;
  slugValid: boolean;
  exists: boolean;
  path: string;
}

export interface SiteProxySetupProps {
  hostname: string;
  aliasOrigin: string;
  mounts: SiteMounts;
  checkAction?: ReactNode;
}

export interface SiteDnsSetupProps extends SiteScope {
  domain: SiteDomain;
  checkAction: ReactNode;
}

export interface SiteDnsRecordValueProps {
  value: string;
  label: string;
}

export interface SiteDnsRecordsTableProps {
  records: SiteDomainRecord[];
}

export interface SiteDnsProviderButtonProps {
  providerName: string;
  href: string;
  oneClick?: boolean;
}

export interface SiteDomainSetupProps extends SiteScope {
  domain: SiteDomain;
  aliasOrigin: string;
  mounts: SiteMounts;
}

export interface SiteDomainStatusDotProps {
  status: SiteDomainChipStatus;
}

export interface SiteDomainCheckButtonProps {
  scope: SiteScope;
  domain: Pick<SiteDomain, "id" | "hostname">;
  variant?: "ghost" | "outline";
}

export interface SiteDomainRowMenuProps {
  hostname: string;
  url: string;
  canOpen: boolean;
  onRemove?: () => void;
}

export interface SiteDomainsTableProps extends SiteScope {
  aliasOrigin: string;
  mounts: SiteMounts;
  domains: SiteDomain[];
  onRemove: (domain: SiteDomain) => void;
}

export interface SiteDomainAddDialogProps extends SiteScope {
  mounts: SiteMounts;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface SiteDomainRemoveDialogProps extends SiteScope {
  domain: SiteDomain | null;
  aliasOrigin: string;
  onOpenChange: (open: boolean) => void;
}

export interface SiteSuggestInputProps {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  suggestions: string[];
  icon: IconSvgElement;
  placeholder?: string;
  emptyLabel: string;
  invalid?: boolean;
  describedBy?: string;
}

export interface SiteIntegrationLogoProps {
  provider: SiteIntegrationProvider;
  className?: string;
}

export interface SiteIntegrationRowProps {
  provider: SiteIntegrationProvider;
  isSetUp: boolean;
  onOpen: () => void;
  onRemove: () => void;
}

export interface SiteIntegrationDialogProps {
  scope: SiteScope;
  provider: SiteIntegrationProvider;
  settings: Record<string, unknown> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface SiteImportListProps {
  organizationId: string;
  organizationSlug: string;
  repositories: SiteImportableRepository[];
  installed: boolean;
  isLoading: boolean;
  importingId: string | null;
  onImport: (repository: SiteImportableRepository) => void;
}

export type SiteCreateStepState = "active" | "done" | "locked";

export interface SiteCreateStepProps {
  title: string;
  description?: string;
  state: SiteCreateStepState;
  footer?: ReactNode;
  onActivate?: () => void;
  children: ReactNode;
}

export interface SiteCreateStepListProps {
  steps: { id: SiteCreateStepId; label: string; state: SiteCreateStepState }[];
  onSelect: (id: SiteCreateStepId) => void;
}

export interface SiteCreateStageProps {
  activeIndex: number;
  left: ReactNode;
  right: ReactNode;
  children: ReactNode;
}

export interface SiteCreateDeployProps {
  organizationId: string;
  organizationSlug: string;
  site: { id: string; liveUrl: string };
  deploymentQueued: boolean;
  starterPullRequestUrl?: string | null;
}

export interface SiteCreateStarterProps {
  organizationId: string;
  repositoryId: string;
  branch: string;
  rootDirectory: string;
  pullRequestUrl: string | null;
  onPullRequestOpened: (url: string) => void;
}

export interface SiteRootDirectoryToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}
