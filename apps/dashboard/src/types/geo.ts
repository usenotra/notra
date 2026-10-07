import type { ToneProfile } from "@notra/ai/schemas/tone";
import type { GeoWriterBrief } from "@notra/ai/types/geo-writer";
import type { GeoWriterSourceKind } from "@notra/db/types/geo-writer";
import type {
  AiTrafficResponse,
  WebAnalyticsOutcome,
  WebAnalyticsResponse,
  WebAnalyticsSource,
  GeoAnswerSource,
  GeoChangeEvent,
  GeoChangesSummary,
  GeoChangesSummaryGroup,
  GeoChatSkin,
  GeoCompetitor,
  GeoCompetitorPromptRow,
  GeoCompetitorPromptSummary,
  GeoCompetitorSharePoint,
  GeoCompetitorShareTimeseriesPoint,
  GeoEngineFamily,
  GeoIngestFramework,
  GeoIngestPackageManager,
  GeoIngestSetupResponse,
  GeoJourney,
  GeoJourneyDailyPoint,
  GeoJourneyPageStats,
  GeoJourneySourceStats,
  GeoJourneyStatsResponse,
  GeoJourneyPathKind,
  GeoLanguageSharePoint,
  GeoModelCatalog,
  GeoModelCatalogEntry,
  GeoOverviewEngine,
  GeoPresenceStatus,
  GeoProject,
  GeoPromptHistoryCheck,
  GeoPromptIntent,
  GeoPromptReceiptView,
  GeoPromptResult,
  GeoPromptResultSummary,
  GeoPromptSequence,
  GeoPromptSource,
  GeoRangePreset,
  GeoScopeInput,
  GeoSequenceTurnResult,
  GeoSettings,
  GeoSparklineMode,
  GeoSparklinePoint,
  GeoStatDeltaKind,
  GeoSuggestionKeyword,
  GeoTab,
  GeoTimeseriesPoint,
  GeoTrackedPrompt,
  GeoTrafficFunnelStageKey,
  GeoTrafficLogEntry,
  GeoTrafficPage,
  GeoTrafficPoint,
  GeoTrafficSource,
  GeoTrafficSourceGroupDefinition,
  GeoTrafficTotals,
  GeoVisitorType,
  MentionProviderRow,
  ShareOfVoiceRow,
  GeoPromptTranslationLanguagePlan,
  GeoPromptTranslationEntry,
} from "@notra/geo-core/types/geo";
import type { TableColumn } from "@notra/ui/components/ui/data-table";
import type {
  ComponentProps,
  ComponentPropsWithoutRef,
  ReactNode,
} from "react";
import type { useTranslations } from "use-intl";

import type { Button } from "@/components/button";
import type { GeoPromptDetailSurface } from "@/types/analytics/geo-events";
import type { ChartConfig, ChartSeriesColors } from "@/types/charts";
import type { GeoPromptDetailState } from "@/types/geo-prompt-detail";
import type { GeoScanModelMenuProps } from "@/types/geo-scan-activity";

export interface GeoProjectCreateInput {
  name: string;
  brandSettingsId: string;
  /** Tracked languages; the first one is the language prompts are written in. */
  languages: string[];
}

export interface GeoProjectContextValue {
  projectId: string | undefined;
  trafficHost: string;
  setTrafficHost: (value: string) => void;
}

export interface GeoActiveProject {
  project: GeoProject | null;
  domain: string | null;
}

export interface GeoProjectProviderProps {
  projectId: string | undefined;
  children: ReactNode;
  trafficHost?: string;
  setTrafficHost?: (value: string) => void;
}

export interface GeoProjectQueryProviderProps {
  /** Server-resolved project used until the URL carries `?project=`. */
  initialProjectId?: string;
  children: ReactNode;
}

export interface GeoProjectBrandIdentity {
  id: string;
  name: string;
  websiteUrl: string | null;
}

export interface GeoProjectCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onCreated: (projectId: string) => void;
}

export interface GeoProjectBrandSelectionProps {
  identities: GeoProjectBrandIdentity[];
  selectedIdentity: GeoProjectBrandIdentity | undefined;
  projectName: string;
  disabled: boolean;
  onSelect: (id: string | null) => void;
}

export interface GeoProjectDeleteSectionProps {
  organizationId: string;
  project: GeoProject;
  replacementProjectId: string | undefined;
  onDeleted: (projectId: string) => void;
}

export interface GeoProjectBrandSectionProps {
  organizationId: string;
  project: GeoProject;
}

export interface GeoProjectLogoProps {
  name: string;
  domain: string | null;
  className?: string;
  /** Applied only while the generated placeholder avatar is shown. */
  fallbackClassName?: string;
}

export interface GeoPageClientProps {
  organizationSlug: string;
}

export interface TrafficPageViewProps {
  organizationId: string;
  organizationSlug: string;
  projectId: string | undefined;
  settings: GeoSettings | null;
  isEmptyTraffic: boolean;
  geoRange: GeoRangeControl;
  traffic: AiTrafficResponse | undefined;
  isTrafficPending: boolean;
  knownHosts: readonly string[];
  isPagesPending: boolean;
  trafficPages: readonly GeoTrafficPage[];
  ingestSetup: GeoIngestSetupResponse | undefined;
  web: WebAnalyticsResponse | undefined;
}

export interface GeoTrafficSkeletonProps {
  geoRange?: GeoRangeControl;
}

export interface GeoProjectScopeProps {
  slug: string;
  children: ReactNode;
}

export interface GeoLiveProviderProps {
  organizationId: string;
  children: ReactNode;
}

export interface GeoOverviewPageEmpty {
  status: "empty";
  organizationId: string;
}

export interface GeoOverviewPageReady {
  status: "ready";
  organizationId: string;
  organizationSlug: string;
  companyName: string;
  geoRange: GeoRangeControl;
  isScanning: boolean;
  revealActive: boolean;
  tabs: GeoTabsProps;
  scanMenu: GeoScanModelMenuProps;
}

export type GeoOverviewPageModel =
  | { status: "loading" }
  | GeoOverviewPageEmpty
  | GeoOverviewPageReady;

export interface GeoOverviewLoadedProps {
  page: GeoOverviewPageReady;
}

export interface GeoStatDeltaLabels {
  new: string;
  points: (value: number) => string;
}

export interface GeoStatDeltaProps {
  delta: number | null;
  kind?: GeoStatDeltaKind;
  variant?: "pill" | "plain";
  /** Rolls changed characters when the delta updates (range switches). */
  animated?: boolean;
  label?: string;
  hint?: string;
  className?: string;
}

export interface PromptEngineSwitcherProps {
  results: readonly { engine: string }[];
  active: { engine: string };
  onChange: (engine: string, direction: number) => void;
}

export interface GeoSettingsUpsertOptions {
  silentSuccess?: boolean;
}

export interface GeoPromptTableRow {
  id: string;
  prompt: string;
  enabled: boolean;
  source: GeoTrackedPrompt["source"];
  tags: string[];
  intent: GeoPromptIntent;
  mentioned: number;
  total: number;
  bestPosition: number | null;
  presence: GeoPresenceStatus | null;
  results: GeoPromptResultSummary[];
}

export interface GeoPromptBrandCount {
  name: string;
  count: number;
}

export type GeoPromptIntentFilter = GeoPromptIntent | "all";

export type GeoPromptSourceFilter = GeoPromptSource | "all";

export interface GeoPromptTableFilters {
  q: string;
  intent: GeoPromptIntentFilter;
  tag: string;
  source: GeoPromptSourceFilter;
}

export interface PromptTagsActionDialogProps {
  target: PromptTagsDialogTarget | null;
  suggestions: string[];
  onConfirm: (tags: string[]) => void;
  onClose: () => void;
}

export interface PromptTagsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  initialTags: string[];
  suggestions: string[];
  onConfirm: (tags: string[]) => void;
}

export interface PromptTagsFormProps {
  formId: string;
  initialTags: string[];
  suggestions: string[];
  onSubmit: (tags: string[]) => void;
}

export interface PromptTagChipsProps {
  tags: string[];
}

export interface PromptPresenceBadgeProps {
  status: GeoPresenceStatus | null;
}

export interface PromptTagsDialogTarget {
  mode: "edit" | "bulk";
  rows: GeoPromptTableRow[];
}

export interface PromptsPageTabCountProps {
  count: number | undefined;
}

export interface ConversationRowActionsProps {
  sequence: GeoPromptSequence;
  isRunning: boolean;
  isPending: boolean;
  isRunPending: boolean;
  onRun: () => void;
  onToggle: (enabled: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export interface ConversationsCardProps {
  organizationId: string;
  /** Renders Generate and New conversation here instead of above the table. */
  actionsContainer?: HTMLElement | null;
}

export interface ConversationTurnDraft {
  id: string;
  text: string;
}

export interface ConversationBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  sequence: GeoPromptSequence | null;
}

export interface ConversationResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  sequence: GeoPromptSequence | null;
  onRun: () => void;
  isRunning: boolean;
}

export interface GeoSequenceEngineThread {
  engine: string;
  turns: GeoSequenceTurnResult[];
}

export interface ConversationReplayThreadProps {
  engine: string;
  organizationId: string;
  turns: GeoSequenceTurnResult[];
  progress: AnswerReplayProgress | null;
}

export type AnswerReplayStage = "user" | "typing";

export interface AnswerReplayProgress {
  index: number;
  stage: AnswerReplayStage;
  typed: string;
}

export interface AnswerReplayTurn {
  answer: string;
}

export interface GeoScanPayload {
  organizationId: string;
  projectId?: string;
  /**
   * ISO stamp of the scan-slot claim the trigger took. Ownership token for the
   * run: only a writer holding it may release or finish this claim. Absent on
   * runs queued before the token existed.
   */
  claimedAt?: string;
  /**
   * `geo_scans` row the trigger inserted so its caller could poll it. The run
   * adopts this id rather than creating a row of its own. Absent when nobody
   * is waiting on an id or on runs queued before the
   * field existed.
   */
  scanId?: string;
  promptIds?: string[];
  engines?: string[];
}

export interface GeoGenerateFromWebsiteInput {
  url: string;
}

export interface GeoCompetitorSuggestionsInput {
  domain: string;
}

export interface GeoBrandSearchInput {
  query: string;
}

export type GeoCompetitorSuggestionsHandlerInput = GeoScopeInput &
  GeoCompetitorSuggestionsInput;

export type GeoBrandSearchHandlerInput = GeoScopeInput & GeoBrandSearchInput;

export interface GeoTrafficLogQueryOptions {
  host?: string;
}

export interface GeoJourneyPathNode {
  path: string;
  label: string;
  kind: GeoJourneyPathKind;
}

export interface GeoJourneyPathRow extends GeoJourneyPathNode {
  journeys: number;
}

export interface GeoJourneySourceRow {
  source: string;
  visitorType: GeoVisitorType;
  journeys: number;
}

export interface GeoJourneyKindCount {
  kind: GeoJourneyPathKind;
  paths: number;
}

export interface GeoJourneyOverview {
  total: number;
  /** Every source, most journeys first. */
  sources: GeoJourneySourceRow[];
  medianPages: number;
  singleFetchShare: number;
  deepShare: number;
  /** Every fetched page, most journeys first. */
  paths: GeoJourneyPathRow[];
  kindCounts: GeoJourneyKindCount[];
  /** True when a loaded journey hit the per-journey path sample cap, so
   * `paths` and `kindCounts` understate journeys with very many pages. */
  pathsSampled: boolean;
}

export interface GeoJourneyTreeNode extends GeoJourneyPathNode {
  id: string;
  /** Fetches of this path in the journey, revisits included. */
  hits: number;
  firstSeenAt: string;
  children: GeoJourneyTreeNode[];
}

export interface JourneysTabProps {
  journeys: GeoJourney[];
  journeysFailed: boolean;
  journeyStats: GeoJourneyStatsResponse | null;
  journeyStatsFailed: boolean;
  loading: boolean;
  organizationId: string;
  organizationSlug: string;
  revealActive: boolean;
}

export interface JourneysCardProps {
  journeys: GeoJourney[];
  failed: boolean;
  organizationSlug: string;
  onOpenJourney: (journey: GeoJourney) => void;
  onPrefetchJourney: (journey: GeoJourney) => void;
  loading?: boolean;
}

export type GeoJourneyGroupSelection =
  | { kind: "source"; source: string; visitorType: GeoVisitorType }
  | { kind: "page"; path: string };

export interface JourneyGroupSheetProps {
  selection: GeoJourneyGroupSelection | null;
  journeys: readonly GeoJourney[];
  stats: GeoJourneyStatsResponse | null;
  days: string[];
  onOpenChange: (open: boolean) => void;
  onOpenJourney: (journey: GeoJourney) => void;
  onPrefetchJourney: (journey: GeoJourney) => void;
}

/** One cell of the three-up stat header the GEO detail sheets open with. */
export interface SheetStat {
  label: string;
  value: string;
  /** Omit when the sheet has no comparison period; `null` renders nothing. */
  delta?: number | null;
}

export interface SheetStatGridProps {
  stats: readonly SheetStat[];
}

export type JourneyGroupSheetStat =
  | {
      key: "journeys" | "deepCrawls" | "entryPage" | "ofAllJourneys";
      value: string;
      delta?: number | null;
    }
  | { key: "avgDepth"; depth: number };

export interface JourneyPageKindStat {
  kind: "docs" | "blog" | "other";
  pages: number;
}

export interface JourneyGroupContentProps {
  selection: GeoJourneyGroupSelection;
  journeys: readonly GeoJourney[];
  stats: GeoJourneyStatsResponse | null;
  days: string[];
  onOpenJourney: (journey: GeoJourney) => void;
  onPrefetchJourney: (journey: GeoJourney) => void;
}

export interface JourneyGroupHeadingProps {
  selection: JourneyGroupContentProps["selection"];
  lastSeen: string | undefined;
}

export interface JourneyGroupBreakdownProps {
  isSource: boolean;
  sampleMeta: string | undefined;
  overview: GeoJourneyOverview;
}

export interface JourneyGroupSectionTitleProps {
  title: string;
  meta?: string;
}

export interface JourneyPathSummaryProps {
  entryPath: string;
  paths: readonly string[];
  /** Distinct pages in the journey; may exceed the sampled `paths`. */
  distinctPaths: number;
}

export interface JourneyStatCardProps {
  eyebrow: string;
  total: number;
  caption: string;
  /** Percent change vs the previous window; omitted when there is no comparison. */
  delta?: number | null;
  stats: { label: string; value: string }[];
  emptyMessage: string;
  emptyDescription?: string;
  emptyMedia?: ReactNode;
  emptySeed: string;
  children: ReactNode;
}

export interface JourneyEmptyProps {
  title: string;
  description: string;
  media: ReactNode;
  action?: ReactNode;
  className?: string;
}

export interface JourneyOverviewCardProps {
  sources: GeoJourneySourceStats[];
  /** Renders the failure copy instead of the empty state. */
  failed: boolean;
  previewRows: number;
  onOpenSource: (row: GeoJourneySourceStats) => void;
  loading?: boolean;
}

export interface JourneyPathsCardProps {
  pages: GeoJourneyPageStats[];
  /** Renders the failure copy instead of the empty state. */
  failed: boolean;
  loading?: boolean;
  totalPages: number;
  previousTotalPages: number;
  previewRows: number;
  onOpenPath: (row: GeoJourneyPageStats) => void;
}

export interface DailyTrendChartProps {
  points: readonly { day: string; value: number }[];
  /** Series name shown in the tooltip, e.g. "Journeys". */
  label: string;
}

export interface GeoCountCellProps {
  label: string;
  value: number;
  previousValue?: number | null;
  unavailableHint?: string;
}

export interface JourneyPathPillProps {
  node: GeoJourneyPathNode;
  className?: string;
}

export interface JourneyPathTreeProps {
  roots: GeoJourneyTreeNode[];
}

export interface JourneyDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  journey: GeoJourney | null;
}

export interface GeoPackageManagerIconProps {
  manager: GeoIngestPackageManager;
}

export interface GeoIngestSetupPanelProps {
  setup: GeoIngestSetupResponse | undefined;
  className?: string;
}

export interface TrafficEmptyProps {
  setup: GeoIngestSetupResponse | undefined;
}

export interface GeoSetupEmptyProps {
  organizationId: string;
  page?: string;
}

export interface GeoSetupButtonProps {
  organizationId: string;
  children?: ReactNode;
  className?: string;
  size?: ComponentProps<typeof Button>["size"];
}

export interface GeoScanScheduleProps {
  id: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  intervalHours: number;
}

export interface GeoScanFrequencySelectProps {
  id: string;
  intervalHours: number;
  onIntervalChange: (hours: number) => void;
  disabled?: boolean;
}

export interface AiTrafficCardProps {
  traffic: AiTrafficResponse | undefined;
  range?: GeoRangeQuery;
  /** Top pages across every host, for the source drawer. */
  pages: readonly GeoTrafficPage[];
  settingsHref: string;
  isPending?: boolean;
  showHero?: boolean;
}

export interface GeoTrafficPageSource {
  source: string;
  visitorType: GeoVisitorType;
  visits: number;
  lastSeenAt: string;
}

export interface GeoTrafficPageGroup {
  host: string;
  path: string;
  visits: number;
  previousVisits?: number;
  lastSeenAt: string;
  sources: GeoTrafficPageSource[];
}

export interface TrafficPageSourcesCellProps {
  group: GeoTrafficPageGroup;
}

export interface TrafficPagesCardProps {
  pages: readonly GeoTrafficPage[];
  isPending?: boolean;
}

export interface TrafficPagesResultsProps {
  columns: TableColumn<GeoTrafficPageGroup>[];
  filteredGroups: GeoTrafficPageGroup[];
  isPending: boolean;
}

export interface TrafficPagesFiltersProps {
  pathQuery: string;
  onPathQueryChange: (value: string) => void;
}

export interface PresenceBadgeProps {
  status: GeoPresenceStatus | null;
}

export interface GeoBarProps {
  value: number;
  max?: number;
  className?: string;
  fillClassName?: string;
  fillColor?: string;
}

export interface GeoRateSparklineProps {
  points: readonly GeoSparklinePoint[];
  className?: string;
  ariaLabel?: string;
  style?: React.CSSProperties;
  color?: string;
  label?: string;
}

export interface GeoPromptCoverage {
  mentioned: number;
  total: number;
  rate: number | null;
}

export interface LanguagePerformanceCardProps {
  points: GeoLanguageSharePoint[];
  organizationId: string;
  settings: GeoSettings;
  isScanning?: boolean;
}

export interface MentionProviderRowProps {
  rank: number;
  row: MentionProviderRow;
  onOpen: (family: GeoEngineFamily) => void;
  onTrack: (engine: string, name: string) => void;
  trackEngine?: string;
  trackingDisabled: boolean;
  tracking: boolean;
}

export interface MentionRateCardProps extends EngineFamilyBrandScope {
  engines: GeoOverviewEngine[];
  settings?: GeoSettings;
  trackedEngines?: readonly string[];
  timeseriesPoints?: readonly GeoTimeseriesPoint[];
  promptResults?: readonly GeoPromptResultSummary[];
  isScanning?: boolean;
  organizationSlug?: string;
}

export interface PromptResultsPreviewProps {
  results: GeoPromptResultSummary[];
  limit?: number;
  isScanning?: boolean;
  variant?: "all" | "unseen";
  gapsHref?: string;
}

export interface GeoPromptsPanelProps {
  results: GeoPromptResultSummary[];
  isScanning?: boolean;
  gapsHref?: string;
}

export interface PromptSentimentLabelProps {
  sentiment: string | null;
}

export interface EngineFamilyBrandScope {
  companyName?: string | null;
  aliases?: readonly string[];
  competitors?: readonly GeoCompetitor[];
  /** Own brand website domain, used to resolve the own-brand logo. */
  ownDomain?: string | null;
}

export interface EngineRateTableProps extends EngineFamilyBrandScope {
  engines: GeoOverviewEngine[];
  /** Engines the workspace still scans. Omit to show every scanned engine. */
  trackedEngines?: readonly string[];
  timeseriesPoints?: readonly GeoTimeseriesPoint[];
  promptResults?: readonly GeoPromptResultSummary[];
  isScanning?: boolean;
  organizationSlug?: string;
}

export interface EngineFamilyBrandRow {
  key: string;
  name: string;
  mentions: number;
  share: number;
  own: boolean;
}

export interface EngineFamilyPromptHit {
  promptId: string;
  prompt: string;
  mentioned: boolean;
  ownedSourceCited?: boolean;
  position: number | null;
}

export interface EngineFamilySheetProps extends EngineFamilyBrandScope {
  family: GeoEngineFamily | null;
  timeseriesPoints?: readonly GeoTimeseriesPoint[];
  promptResults?: readonly GeoPromptResultSummary[];
  organizationSlug?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface GeoTabsProps {
  activeTab: GeoTab;
  onActiveTabChange: (tab: GeoTab) => void;
  organizationSlug: string;
  revealActive: boolean;
  settings: GeoSettings;
  engines: GeoOverviewEngine[];
  timeseriesPoints: GeoTimeseriesPoint[];
  competitorPoints: GeoCompetitorSharePoint[];
  competitorShareTimeseries?: readonly GeoCompetitorShareTimeseriesPoint[];
  competitors: GeoCompetitor[];
  languagePoints: GeoLanguageSharePoint[];
  promptResults: GeoPromptResultSummary[];
  promptCount: number;
  isScanning: boolean;
  journeys: GeoJourney[];
  journeysFailed: boolean;
  journeyStats: GeoJourneyStatsResponse | null;
  journeyStatsFailed: boolean;
  journeysLoading: boolean;
  organizationId: string;
}

export interface GeoDateRange {
  dateFrom: string;
  dateTo: string;
}

export interface GeoRangeState {
  preset: GeoRangePreset | "custom";
  range: GeoDateRange;
}

export interface GeoRangeQuery {
  from: string;
  to: string;
}

export interface GeoQueryScope {
  organizationId: string;
  projectId: string | undefined;
}

export interface GeoRangeControl extends GeoRangeState {
  days: number;
  query: GeoRangeQuery;
  param: string | null;
  setPreset: (preset: GeoRangePreset) => void;
  setCustom: (range: GeoDateRange) => void;
}

export interface MentionTrendSeries {
  key: string;
  engine: string;
  label: string;
}

export interface MentionTrendCardProps {
  points: GeoTimeseriesPoint[];
  isScanning?: boolean;
}

export interface GeoRangePickerProps {
  control: GeoRangeControl;
}

export interface MentionTrendAgentsPickerProps {
  series: readonly MentionTrendSeries[];
  activeKeys: ReadonlySet<string>;
  onToggle: (key: string) => void;
  disabled?: boolean;
}

export interface AiTrafficLogCardProps {
  organizationId: string;
}

export interface CitationsTableProps {
  entries: GeoTrafficLogEntry[];
  height: number;
  /**
   * The query the entries answer; rows only animate in while it stays the
   * same. Undefined while the entries are another query's placeholder.
   */
  liveKey?: string;
  loading?: boolean;
}

export interface PurposeBadgeProps {
  category: string;
  compact?: boolean;
  tooltip?: boolean;
}

export type GeoTrafficSourceBand = "crawler" | "cited" | "ai_referral";

export interface GeoTrafficSourceGroup extends GeoTrafficSourceGroupDefinition {
  visitorType: GeoVisitorType;
  band: GeoTrafficSourceBand;
  visits: number;
  markdownVisits: number;
  paths: number;
  lastSeenAt: string;
  categories: string[];
  members: GeoTrafficSource[];
}

export interface GeoTrafficGroupPage {
  key: string;
  host: string;
  path: string;
  visits: number;
  lastSeenAt: string;
}

export interface TrafficSourceSheetProps {
  group: GeoTrafficSourceGroup | null;
  series: { day: string; value: number }[];
  pages: readonly GeoTrafficPage[];
  onOpenChange: (open: boolean) => void;
}

export interface TrafficSourceSheetContentProps {
  group: GeoTrafficSourceGroup;
  series: { day: string; value: number }[];
  pages: readonly GeoTrafficPage[];
}

export interface TrafficSourceGroupCellProps {
  group: GeoTrafficSourceGroup;
}

export interface TrafficPurposeCellProps {
  group: GeoTrafficSourceGroup;
}

export interface GeoTrafficPurposeTotal {
  category: string;
  visits: number;
  members: string[];
}

export interface TrafficSourceGroupIconProps {
  group: GeoTrafficSourceGroupDefinition;
  className?: string;
}

export interface GeoSkinMessageProps {
  skin: GeoChatSkin;
  from: "user" | "assistant";
  search?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

export interface EngineIconProps {
  engine: string;
  className?: string;
  darkSurface?: boolean;
}

export interface GeoProviderWordmarkProps {
  provider: string;
  label: string;
  className?: string;
}

export interface GeoModeIconProps {
  mode: GeoSparklineMode;
  className?: string;
}

export interface ParsedModelId {
  provider: string;
  slug: string;
}

export interface ModelProviderLogoProps {
  provider: string;
  className?: string;
}

export interface CodeSnippetProps {
  code: string;
  className?: string;
  filename?: string;
  headerEnd?: ReactNode;
  /** Variant switcher shown in the header (e.g. `CodeSnippetTabs`). */
  tabs?: ReactNode;
  variant?: "command" | "panel";
  label?: string;
  onCopy?: () => void;
}

export interface CodeSnippetTabOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

export interface CodeSnippetTabsProps {
  label: string;
  value: string;
  options: readonly CodeSnippetTabOption[];
  onValueChange: (value: string) => void;
}

export interface CopyPromptButtonProps {
  prompt: string;
  disabled?: boolean;
  onCopy?: () => void;
  className?: string;
}

export interface CopyCodeButtonProps {
  code: string;
  label: string;
  onCopy?: () => void;
}

export type GeoSettingsFormSection = "brand" | "languages" | "models";

export interface GeoSettingsFormProps {
  organizationId: string;
  settings: GeoSettings | null;
  catalog: GeoModelCatalog;
  promptCount?: number;
  hideHeader?: boolean;
  section?: GeoSettingsFormSection;
}

export interface GeoBrandSectionProps {
  id: string;
  companyName: string;
  onCompanyNameChange: (value: string) => void;
  aliases: string[];
  onAliasesChange: (values: string[]) => void;
  conversionPaths: string[];
  onConversionPathsChange: (values: string[]) => void;
  domains: string[];
  onDomainsChange: (values: string[]) => void;
  brandDomain: string | null;
  nameMissing: boolean;
  savedAt: Date | null;
}

export interface GeoLanguagesSectionProps {
  languages: string[];
  onLanguagesChange: (values: string[]) => void;
  promptLanguage?: string;
}

export interface GeoModelsSectionProps {
  id: string;
  catalog: GeoModelCatalog;
  engines: string[];
  onEnginesChange: (values: string[]) => void;
  enforceZdr: boolean;
  onEnforceZdrChange: (value: boolean) => void;
  nonZdrApproved: string[];
  onNonZdrApprovedChange: (values: string[]) => void;
  canEnforceZdr: boolean;
  planLoading: boolean;
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  scanIntervalHours: number;
  onScanIntervalHoursChange: (value: number) => void;
  scanSizeNote: { className: string; text: string } | null;
}

export interface GeoSettingsAutosaveInput {
  organizationId: string;
  companyName: string;
  aliases: string[];
  competitors: string[];
  conversionPaths: string[];
  domains: string[];
  languages: string[];
  engines: string[];
  enforceZdr: boolean;
  nonZdrApproved: string[];
  enabled: boolean;
  scanIntervalHours: number;
  canEnforceZdr: boolean;
  planLoading: boolean;
  catalog: GeoModelCatalog;
  settings: GeoSettings | null;
  brandDomain: string | null;
}

export interface GeoTagListProps {
  id: string;
  label: string;
  description?: ReactNode;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  max: number;
  disabled?: boolean;
  /** When false, the field still has an accessible name via `label`. */
  labeled?: boolean;
  inputClassName?: string;
  inline?: boolean;
}

export interface GeoEnginePickerProps {
  catalog: GeoModelCatalog;
  selected: string[];
  onChange: (values: string[]) => void;
  enforceZdr: boolean;
  onEnforceZdrChange: (value: boolean) => void;
  nonZdrApproved: string[];
  onNonZdrApprovedChange: (values: string[]) => void;
  /** Whether the organization may enforce ZDR (ZDR add-on). */
  canEnforceZdr: boolean;
  /** True while the plan is still loading; keeps the ZDR toggle inert. */
  planLoading?: boolean;
  disabled?: boolean;
  labeled?: boolean;
  /** Rendered as the first row of the options group under the model list. */
  scheduleRow?: ReactNode;
}

export interface GeoEngineProviderListProps {
  catalog: GeoModelCatalog;
  disabled: boolean;
  expanded: ReadonlySet<string>;
  id: string;
  lastSelected: boolean;
  nonZdrApproved: readonly string[];
  onToggleExpanded: (providerId: string) => void;
  onToggleModel: (model: GeoModelCatalogEntry, checked: boolean) => void;
  onToggleProvider: (
    models: readonly GeoModelCatalogEntry[],
    visibleModels: readonly GeoModelCatalogEntry[],
    checked: boolean
  ) => void;
  onToggleShowAllModels: (providerId: string) => void;
  onToggleShowMore: () => void;
  selected: readonly string[];
  showAllModels: ReadonlySet<string>;
  showMore: boolean;
  zdrActive: boolean;
}

export interface GeoEngineProviderRowProps {
  approvedNonZdrIds: ReadonlySet<string>;
  catalog: GeoModelCatalog;
  disabled: boolean;
  expanded: boolean;
  hiddenCount: number;
  id: string;
  lastSelected: boolean;
  onToggleExpanded: (providerId: string) => void;
  onToggleModel: (model: GeoModelCatalogEntry, checked: boolean) => void;
  onToggleProvider: GeoEngineProviderListProps["onToggleProvider"];
  onToggleShowAllModels: (providerId: string) => void;
  provider: GeoModelCatalog["providers"][number];
  providerIndex: number;
  reduceMotion: boolean | null;
  revealIndex: number;
  selectedCount: number;
  selectedIds: ReadonlySet<string>;
  showAllModels: boolean;
  showMore: boolean;
  zdrActive: boolean;
}

export interface GeoEngineProviderModelsProps {
  additionalModels: readonly GeoModelCatalogEntry[];
  approvedNonZdrIds: ReadonlySet<string>;
  disabled: boolean;
  id: string;
  lastSelected: boolean;
  onToggleModel: (model: GeoModelCatalogEntry, checked: boolean) => void;
  onToggleShowAllModels: (providerId: string) => void;
  primaryModels: readonly GeoModelCatalogEntry[];
  providerId: string;
  selectedIds: ReadonlySet<string>;
  showAllModels: boolean;
  zdrActive: boolean;
}

export type GeoFlagState = "enabled" | "disabled" | "unavailable";

export interface GeoLanguagePickerProps {
  selected: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
  labeled?: boolean;
  /** Id for the search input, so a visible label can point at it. */
  inputId?: string;
  inputClassName?: string;
  /** The project's prompt language; it cannot be removed. */
  lockedLanguage?: string | null;
}

export interface ShareOfVoiceCardProps {
  points: GeoCompetitorSharePoint[];
  timeseries?: readonly GeoCompetitorShareTimeseriesPoint[];
  competitors?: GeoCompetitor[];
  isScanning?: boolean;
  organizationSlug?: string;
  organizationId?: string;
  companyName?: string | null;
  aliases?: readonly string[];
}

export interface ShareOfVoiceTableProps {
  points: GeoCompetitorSharePoint[];
  timeseries?: readonly GeoCompetitorShareTimeseriesPoint[];
  competitors?: GeoCompetitor[];
  limit?: number;
  isScanning?: boolean;
  onRowClick?: (row: ShareOfVoiceRow) => void;
  onRowPointerEnter?: (row: ShareOfVoiceRow) => void;
  companyName?: string | null;
  aliases?: readonly string[];
  ownDomain?: string | null;
}

export interface BrandTrackingBadgeProps {
  tracked: boolean;
  className?: string;
}

export interface TrackBrandButtonProps {
  brand: string;
  onTrack: (brand: string) => void;
  className?: string;
}

export interface ShareOfVoiceChartProps {
  points: GeoCompetitorSharePoint[];
  /** Daily mentions per brand; drives the change indicators. */
  timeseries?: GeoCompetitorShareTimeseriesPoint[];
  competitors?: GeoCompetitor[];
  limit?: number;
  isScanning?: boolean;
  onSliceClick?: (row: ShareOfVoiceRow) => void;
  onSlicePointerEnter?: (row: ShareOfVoiceRow) => void;
  companyName?: string | null;
  aliases?: readonly string[];
  organizationId?: string;
}

export interface ShareOfVoiceRankingRow extends ShareOfVoiceRow {
  rank: number | null;
  own: boolean;
}

export interface ShareOfVoiceRankingRowProps {
  row: ShareOfVoiceRankingRow;
  competitors?: GeoCompetitor[];
  ownDomain?: string | null;
  onOpen?: (row: ShareOfVoiceRow) => void;
  onPrefetch?: (row: ShareOfVoiceRow) => void;
  onTrack?: (brand: string) => void;
}

export interface CompetitorShareCardProps {
  points: GeoCompetitorSharePoint[];
  timeseries?: GeoCompetitorShareTimeseriesPoint[];
  companyName: string | null;
  aliases?: readonly string[];
  competitors?: GeoCompetitor[];
  isScanning?: boolean;
  organizationSlug?: string;
  organizationId?: string;
}

export interface EngineMatrixColumn {
  family: string;
  /** Engine id with the most checks, used for the column icon. */
  engine: string;
  label: string;
  checks: number;
}

export interface EngineMatrixRow {
  brand: string;
  own: boolean;
  /** Mention rate per column, `null` where the engine has no checks. */
  rates: (number | null)[];
  /** Answers mentioning the brand, per column. */
  mentions: number[];
}

export interface EngineMatrix {
  columns: EngineMatrixColumn[];
  rows: EngineMatrixRow[];
  minRate: number;
  maxRate: number;
}

export interface CompetitorEngineMatrixCardProps {
  organizationId: string;
  range: GeoRangeQuery;
  companyName: string | null;
  aliases?: readonly string[];
  competitors?: GeoCompetitor[];
  trackedEngines?: readonly string[];
  isScanning?: boolean;
  organizationSlug?: string;
}

export interface CompetitorEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  competitor: GeoCompetitor | null;
  initialName?: string;
  /** Shows a CSV import shortcut in the footer; closes the dialog first. */
  onImportCsv?: () => void;
}

export interface CompetitorEditFormProps {
  organizationId: string;
  competitor: GeoCompetitor | null;
  initialName?: string;
  onDone: () => void;
  onCancel?: () => void;
  onImportCsv?: () => void;
}

export interface CompetitorSummaryStatsProps {
  competitor: string;
  summary: GeoCompetitorPromptSummary | null;
  /** The detail request failed, so a null summary is unknown rather than empty. */
  unavailable: boolean;
}

export interface CompetitorPromptAppearancesProps {
  competitor: string;
  prompts: GeoCompetitorPromptRow[];
  columns: TableColumn<GeoCompetitorPromptRow>[];
  tableHeight: number;
  showLoading: boolean;
  unavailable: boolean;
  onRowClick: (row: GeoCompetitorPromptRow) => void;
}

export interface ScanPreflightDialogProps {
  confirmationOnly?: boolean;
  organizationId: string;
  prompt?: string;
  /** Id of the single prompt being scanned. */
  promptId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (engines?: string[]) => void;
  isPending: boolean;
  promptCount: number | undefined;
  engines: readonly string[];
  languages: readonly string[];
  lastScanAt: string | null;
}

export interface PromptScanButtonProps {
  organizationId: string;
  row: GeoPromptTableRow;
  compact?: boolean;
  /** Filled primary trigger for the main action of a surface. */
  primary?: boolean;
  onPrepare?: () => void;
}

export interface GeoCompetitorDetailPoint {
  day: string;
  rawDay: string;
  mentions: number;
  [key: string]: string | number;
}

export interface GeoCompetitorMentionStats {
  latest: number;
  latestDay: string;
  peak: number;
}

export interface CompetitorsTableProps {
  competitors: GeoCompetitor[];
  organizationId: string;
  organizationSlug: string;
  companyName: string;
  aliases: string[];
  ownDomain: string | null;
  isScanning?: boolean;
  /** Share of voice per lowercased brand name; empty before the first scan. */
  shareByBrand: ReadonlyMap<string, ShareOfVoiceRow>;
}

export interface PromptsTableProps {
  organizationId: string;
  prompts: GeoTrackedPrompt[];
  results: GeoPromptResultSummary[];
  isScanning?: boolean;
  onAddPrompt: () => void;
  onImportCsv: () => void;
}

export type PromptAddMode = "write" | "website";

export interface PromptAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Opens the CSV import from the footer, for adding prompts in bulk. */
  onImportCsv?: () => void;
  organizationId: string;
}

export interface PromptKeywordSegment {
  text: string;
  keyword: GeoSuggestionKeyword | null;
}

export interface PromptKeywordTextareaProps extends Omit<
  ComponentPropsWithoutRef<"textarea">,
  "value"
> {
  keywords: GeoSuggestionKeyword[];
  value: string;
}

export interface GeoRemoveDialogNouns {
  singular: string;
  plural: string;
}

export interface GeoRemoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: string[];
  onConfirm: () => void;
  isPending: boolean;
  nouns: GeoRemoveDialogNouns;
  description: string | ((items: string[]) => string);
  actionLabel?: string;
  destructive?: boolean;
  title?: string;
}

export interface PromptDetailDialogProps {
  scanId?: string;
  initialLanguage?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fires once the open or close animation has finished. */
  onOpenChangeComplete?: (open: boolean) => void;
  row: GeoPromptTableRow | null;
  isScanning?: boolean;
  surface?: GeoPromptDetailSurface;
  organizationId?: string;
  /** Engine to show first; falls back to the first result when absent. */
  initialEngine?: string | null;
}

export interface PromptAnswerPageProps {
  scanId?: string;
  initialLanguage?: string;
  onPrepareScan?: () => void;
  row: GeoPromptTableRow;
  open: boolean;
  organizationId: string;
  isScanning?: boolean;
  initialEngine?: string | null;
  surface?: GeoPromptDetailSurface;
}

export type PromptHistoryChangeKind =
  | "gained"
  | "lost"
  | "position"
  | "none"
  | "first";

/**
 * One sentence in the scan-history "What changed" cell, describing how the
 * brand's own outcome moved since the previous scan. Structured so the
 * renderer can highlight positions inline; use `promptHistoryChangeText` for
 * the plain-text form.
 */
export type PromptHistoryChange =
  | { kind: "gained"; position: number | null }
  | { kind: "lost" }
  | { kind: "position"; from: number | null; to: number | null }
  | { kind: "none" }
  | { kind: "first" };

export interface PromptHistoryEntry {
  check: GeoPromptHistoryCheck;
  changes: PromptHistoryChange[];
  /** Brands recommended in this scan that the previous scan did not name. */
  newCompetitors: string[];
}

export interface PromptReceiptViewSwitchProps {
  view: GeoPromptReceiptView;
  onChange: (view: GeoPromptReceiptView) => void;
}

export interface PromptReceiptAnalysisProps {
  scrollable?: boolean;
  showHistory?: boolean;
  prompt: string;
  result: GeoPromptResult;
  history: GeoPromptHistoryCheck[];
  isHistoryLoading: boolean;
  /** Tracked competitors, used to resolve brand logos by domain. */
  competitors?: readonly GeoCompetitor[];
  /** Opens the answer captured by one scan from the history. */
  onSelectCheck?: (check: GeoPromptHistoryCheck) => void;
}

export interface PromptAnswerContentProps extends Omit<
  PromptReceiptAnalysisProps,
  "result" | "prompt"
> {
  organizationId?: string;
  state: GeoPromptDetailState;
  view: GeoPromptReceiptView;
  onRetry: () => void;
  prompt?: string;
}

export interface PromptReceiptHistoryProps {
  entries: PromptHistoryEntry[];
  isLoading: boolean;
  /** Opens the answer captured by one scan. Rows become clickable when set. */
  onSelect?: (check: GeoPromptHistoryCheck) => void;
}

export interface GeoAnswerActionsProps {
  text: string;
  sources: readonly GeoAnswerSource[];
}

export interface GeoPromptAnswerThreadProps {
  scrollable?: boolean;
  organizationId?: string;
  prompt: string;
  result: GeoPromptResult;
}

export interface CompetitorLogoProps {
  name: string;
  domain?: string | null;
  /** Tracked competitors — used to resolve a domain for the favicon. */
  competitors?: readonly GeoCompetitor[];
  className?: string;
  onSettled?: () => void;
}

export interface CompetitorLogoPreviewProps {
  name: string;
  website: string;
  className?: string;
}

export interface CompetitorDetailViewProps {
  organizationSlug: string;
  competitor: string;
  variant?: "modal" | "page";
}

export interface CompetitorSheetProps {
  title: string;
  children: ReactNode;
}

export interface CompetitorDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  competitor: string | null;
  domain: string | null;
}

export interface CompetitorRowProps {
  competitor: string;
  domain: string | null;
  isPending: boolean;
  onSelect: (competitor: string) => void;
  onRemove: (competitor: string) => void;
}

export interface CountryFlagProps {
  code: string;
  className?: string;
}

export interface TwemojiProps {
  emoji: string;
  label: string;
  className?: string;
}

export interface GeoPromptSuggestionRow {
  id: string;
  prompt: string;
  title: string | null;
  source: "search_console";
  sourceKeywords: GeoSuggestionKeyword[];
  createdAt: Date;
}

export interface GeoPromptSuggestion {
  id: string;
  prompt: string;
  title: string | null;
  source: "search_console";
  keywords: GeoSuggestionKeyword[];
  createdAt: string;
}

export interface GeoPromptSuggestionsResponse {
  suggestions: GeoPromptSuggestion[];
}

export interface GeoSuggestionIdInput {
  suggestionId: string;
}

export interface GeoSectionSkeletonProps {
  eyebrow: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export interface GeoSettingsSkeletonSectionProps {
  title: string;
  description: string;
  children: ReactNode;
}

export interface GeoWriterContext {
  organizationId: string;
  projectId: string;
  briefId: string;
  brandSettingsId: string;
  collectionId: string;
  postId: string | null;
  brandName: string;
  language: string | null;
  toneProfile: ToneProfile;
  customTone: string | null;
  topic: string;
  brief: GeoWriterBrief;
  sourceKind: GeoWriterSourceKind;
  sourceId: string | null;
}

export type GeoWriterWorkflowResult =
  | { status: "success"; postId: string; humanized: boolean }
  | { status: "failed"; reason: string }
  | { status: "credits_exhausted" }
  | { status: "duplicate_execution" }
  | { status: "invalid_state" }
  | { status: "invalid_payload" };

export interface TrafficTrendSeries {
  key: string;
  label: string;
  icon: string | null;
  colors: ChartSeriesColors;
}

export interface TrafficTrendMetric {
  key: GeoTrafficFunnelStageKey;
  label: string;
  description: string;
  value: number | null;
  delta: number | null;
}

export interface TrafficHeroProps {
  totals: GeoTrafficTotals;
  previousTotals: GeoTrafficTotals | null;
  days: readonly string[];
  groups: readonly GeoTrafficSourceGroup[];
  points: readonly GeoTrafficPoint[];
  settingsHref: string;
}

export interface TrafficHeroMetricProps {
  metric: TrafficTrendMetric;
  settingsHref: string;
}

export interface TrafficTrendProvider {
  key: string;
  label: string;
  icon: string | null;
  visits: number;
  sources: string[];
}

export interface TrafficProviderLegendProps {
  series: readonly TrafficTrendSeries[];
  hiddenKeys: ReadonlySet<string>;
  onToggle: (key: string) => void;
}

export interface TrafficSourcesGroupProps {
  band: GeoTrafficSourceBand;
  groups: GeoTrafficSourceGroup[];
  columns: TableColumn<GeoTrafficSourceGroup>[];
  collapsed: boolean;
  followedByStack?: boolean;
  onToggle: () => void;
  onOpen: (group: GeoTrafficSourceGroup) => void;
  stacked: boolean;
  loading?: boolean;
}

export interface TrafficSourcesStackProps {
  groups: GeoTrafficSourceGroup[];
  columns: TableColumn<GeoTrafficSourceGroup>[];
  collapsed: ReadonlySet<GeoTrafficSourceBand>;
  onToggle: (band: GeoTrafficSourceBand) => void;
  onOpen: (group: GeoTrafficSourceGroup) => void;
  loading?: boolean;
}

export interface WhatChangedCardProps {
  organizationId: string;
  organizationSlug: string;
  promptResults?: readonly GeoPromptResultSummary[];
  competitors?: readonly GeoCompetitor[];
  isScanning?: boolean;
}

export interface GeoChangeSummaryStatProps {
  direction: "up" | "down";
  label: string;
  hint: string;
  value: number;
}

export interface GeoChangeSummaryGroupProps {
  group: GeoChangesSummaryGroup;
  summary: GeoChangesSummary;
}

export interface GeoChangesSummaryRowProps {
  summary: GeoChangesSummary;
}

export type GeoChangeStateLabel =
  | { key: "new" | "notMentioned" | "mentioned" | "cited" | "notCited" }
  | { key: "position"; position: number };

export interface GeoChangeDetail {
  before: GeoChangeStateLabel;
  after: GeoChangeStateLabel;
}

export interface GeoChangeCellProps {
  event: GeoChangeEvent;
}

export interface GeoChangeCompetitorsCellProps extends GeoChangeCellProps {
  competitors: readonly GeoCompetitor[];
}

export interface GeoImportResultPart {
  key: "imported" | "updated" | "skipped" | "nothingNew";
  count: number;
}

export interface GscSyncResultMessage {
  key:
    | "failed"
    | "skipped"
    | "noData"
    | "noNewSuggestions"
    | "suggestionsAdded";
  count: number;
}

export interface PromptTranslationsSectionProps {
  organizationId: string;
  row: Pick<GeoPromptTableRow, "id" | "source" | "enabled">;
  open: boolean;
}

export interface PromptTranslationRowProps {
  plan: GeoPromptTranslationLanguagePlan;
  promptId: string;
  limit: number;
  busy: boolean;
  translating: boolean;
  onSelect: (language: string, selected: boolean) => void;
  /** Resolves false when the save failed, so the editor keeps its draft. */
  onSave: (language: string, text: string) => Promise<boolean>;
  onReset: (language: string) => void;
}

export interface PromptTranslationEditorProps {
  language: string;
  initialText: string;
  busy: boolean;
  onSave: (text: string) => Promise<boolean>;
  onClose: () => void;
}

export interface PromptTranslationTextProps {
  entry: GeoPromptTranslationEntry;
  busy: boolean;
  translating: boolean;
  onEdit: () => void;
  onReset: () => void;
}

export interface WebTrendRow {
  day: string;
  rawDay: string;
  people: number;
  agents: number;
  [key: string]: string | number;
}

export interface WebVisitorsSectionProps {
  web: WebAnalyticsResponse;
  traffic: AiTrafficResponse | undefined;
  range?: GeoRangeQuery;
}

export interface WebMetricProps {
  label: string;
  value: number;
  previous: number;
}

export interface WebOutcomesTableProps {
  outcomes: readonly WebAnalyticsOutcome[];
}

export interface WebReferrerIconProps {
  source: WebAnalyticsSource;
}

export interface WebBreakdownRow {
  key: string;
  label: ReactNode;
  sortLabel: string;
  value: number;
  previous?: number | null;
  fromAi?: number;
}

export interface WebBreakdownTableProps {
  title: string;
  nameHeader: string;
  valueHeader: string;
  rows: readonly WebBreakdownRow[];
  showFromAi?: boolean;
}

export interface TrafficDomainSelectProps {
  hosts: readonly string[];
}
