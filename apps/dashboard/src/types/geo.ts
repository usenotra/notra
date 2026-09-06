import type { GeoWriterBrief } from "@notra/ai/types/geo-writer";
import type { GeoWriterSourceKind } from "@notra/db/types/geo-writer";
import type {
  AiTrafficResponse,
  GeoChangeEvent,
  GeoChangesSummary,
  GeoChangesSummaryGroup,
  GeoChatSkin,
  GeoCompetitor,
  GeoCompetitorPromptSummary,
  GeoCompetitorSharePoint,
  GeoCompetitorShareTimeseriesPoint,
  GeoEngineFamily,
  MentionProviderRow,
  GeoIngestFramework,
  GeoIngestPackageManager,
  GeoIngestSetupResponse,
  GeoJourney,
  GeoJourneyPathKind,
  GeoLanguageSharePoint,
  GeoModelCatalog,
  GeoOverviewEngine,
  GeoPresenceStatus,
  GeoProject,
  GeoAnswerSource,
  GeoPromptHistoryCheck,
  GeoPromptIntent,
  GeoPromptReceiptView,
  GeoPromptResult,
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
  GeoTrafficLogEntry,
  GeoTrafficPage,
  GeoTrafficPoint,
  GeoTrafficSource,
  GeoTrafficSourceGroupDefinition,
  GeoTrafficFunnelStageKey,
  GeoTrafficTotals,
  GeoTrafficTrendRow,
  GeoVisitorType,
  ShareOfVoiceRow,
} from "@notra/geo-core/types/geo";
import type { GeoRequestPayload } from "@usenotra/geo";
import type {
  ComponentProps,
  ComponentPropsWithoutRef,
  PointerEventHandler,
  ReactNode,
} from "react";

import type { Button } from "@/components/button";
import type { TableColumn } from "@/components/motion/table";
import type { GeoPromptDetailSurface } from "@/types/analytics/geo-events";
import type { ChartConfig, ChartSeriesColors } from "@/types/charts";
import type { TablePaginationState } from "@/types/table";

export interface GeoProjectCreateInput {
  name: string;
  brandSettingsId: string;
}

export interface GeoProjectContextValue {
  projectId: string | undefined;
}

export interface GeoActiveProject {
  project: GeoProject | null;
  domain: string | null;
}

export interface GeoProjectProviderProps {
  projectId: string | undefined;
  children: ReactNode;
}

export interface GeoProjectCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onCreated: (projectId: string) => void;
}

export interface GeoProjectDeleteSectionProps {
  organizationId: string;
  project: GeoProject;
  replacementProjectId: string | undefined;
  onDeleted: (projectId: string) => void;
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

export interface GeoLayoutProps {
  children: ReactNode;
  modal: ReactNode;
  params: Promise<{ slug: string }>;
}

export interface GeoPageContentProps {
  organizationSlug: string;
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
  scanPreflight: ScanPreflightDialogProps;
  onRunScan: () => void;
}

export type GeoOverviewPageModel =
  | { status: "loading" }
  | GeoOverviewPageEmpty
  | GeoOverviewPageReady;

export interface GeoOverviewLoadedProps {
  page: GeoOverviewPageReady;
}

export interface GeoScanSpinnerProps {
  visible: boolean;
}

export interface GeoStatDeltaProps {
  delta: number | null;
  kind?: GeoStatDeltaKind;
  variant?: "pill" | "plain";
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
  results: GeoPromptResult[];
}

export type GeoPromptIntentFilter = GeoPromptIntent | "all";

export type GeoPromptSourceFilter = GeoPromptSource | "all";

export interface GeoPromptTableFilters {
  q: string;
  intent: GeoPromptIntentFilter;
  tag: string;
  source: GeoPromptSourceFilter;
}

export interface GeoPromptFilterOption<T extends string> {
  value: T;
  label: string;
}

export interface GeoPromptSavedView {
  id: string;
  name: string;
  query: GeoPromptTableFilters;
}

export interface UseGeoSavedViewsResult {
  views: GeoPromptSavedView[];
  saveView: (name: string, query: GeoPromptTableFilters) => void;
  removeView: (viewId: string) => void;
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

export interface PromptIntentBadgeProps {
  intent: GeoPromptIntent;
}

export interface PromptPresenceBadgeProps {
  status: GeoPresenceStatus | null;
}

export interface PromptSavedViewsMenuProps {
  views: GeoPromptSavedView[];
  filters: GeoPromptTableFilters;
  onApply: (view: GeoPromptSavedView) => void;
  onSave: (name: string) => void;
  onRemove: (viewId: string) => void;
}

export interface PromptSaveViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string) => void;
}

export interface PromptTagsDialogTarget {
  mode: "edit" | "bulk";
  rows: GeoPromptTableRow[];
}

export interface ConversationsCardProps {
  organizationId: string;
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
  turns: GeoSequenceTurnResult[];
  progress: AnswerReplayProgress | null;
}

export type AnswerReplayStage = "user" | "thinking" | "typing";

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

export interface GeoVisitorSignals {
  clientHints: boolean;
  fetchMode: string | null;
  tracing: boolean;
}

export interface GeoVisitorInput {
  userAgent: string | undefined;
  referer: string | undefined;
  accept: string | undefined;
  signals?: GeoVisitorSignals;
}

export interface GeoVisitorClassification {
  visitorType: GeoVisitorType;
  source: string;
  agent: string;
  category: string;
  confidence: string;
}

export interface GeoTrafficLogQueryOptions {
  refetchInterval?: number | false;
}

export interface GeoJourneyInput {
  url: URL;
  source: string;
  ip: string | undefined;
  capturedAt: Date;
  visitorType: GeoVisitorType;
  category: string;
}

export interface GeoJourneyTuning {
  bucketSeconds: number;
  fullIp: boolean;
}

export interface GeoTrafficEventInput {
  organizationId: string;
  projectId: string | null;
  payload: GeoRequestPayload;
  url: URL;
  capturedAt: Date;
  classification: GeoVisitorClassification;
  journey: GeoJourneyResolution;
}

export interface GeoJourneyResolution {
  journeyId: string;
  path: string;
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
  sources: GeoJourneySourceRow[];
  uniqueSources: number;
  medianPages: number;
  singleFetchShare: number;
  deepShare: number;
  paths: GeoJourneyPathRow[];
  uniquePaths: number;
  kindCounts: GeoJourneyKindCount[];
}

export interface GeoJourneyTrail {
  nodes: GeoJourneyPathNode[];
  omitted: number;
}

export interface JourneysCardProps {
  journeys: GeoJourney[];
  organizationId: string;
}

export interface JourneyOverviewCardProps {
  journeys: GeoJourney[];
}

export interface JourneyPathsCardProps {
  journeys: GeoJourney[];
}

export interface JourneyPathPillProps {
  node: GeoJourneyPathNode;
  className?: string;
}

export interface JourneyPathTrailProps {
  paths: readonly string[];
  limit?: number;
  className?: string;
}

export interface JourneyDetailDialogProps {
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
  settingsHref: string;
}

export interface GeoTrafficPageSource {
  source: string;
  visitorType: GeoVisitorType;
  visits: number;
  lastSeenAt: string;
}

export interface GeoTrafficPageGroup {
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
  pages: GeoTrafficPage[];
  isPending?: boolean;
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

export interface MentionMoreModelsHintProps {
  count: number;
  visible: boolean;
  onClick: () => void;
}

export interface MentionRateCardProps extends EngineFamilyBrandScope {
  engines: GeoOverviewEngine[];
  settings?: GeoSettings;
  trackedEngines?: readonly string[];
  timeseriesPoints?: readonly GeoTimeseriesPoint[];
  promptResults?: readonly GeoPromptResult[];
  isScanning?: boolean;
  organizationSlug?: string;
}

export interface PromptResultsPreviewProps {
  results: GeoPromptResult[];
  limit?: number;
  isScanning?: boolean;
  variant?: "all" | "unseen";
  gapsHref?: string;
}

export interface GeoPromptsPanelProps {
  results: GeoPromptResult[];
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
  timeseriesPoints?: readonly GeoTimeseriesPoint[];
  promptResults?: readonly GeoPromptResult[];
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
  position: number | null;
}

export type FamilyImproveKind =
  | "search-ahead"
  | "memory-ahead"
  | "both-weak"
  | "closing";

export interface FamilyImproveInsight {
  kind: FamilyImproveKind;
  title: string;
  body: string;
}

export interface FamilyImproveCardProps {
  insight: FamilyImproveInsight;
  gapsHref?: string;
}

export interface EngineFamilySheetProps extends EngineFamilyBrandScope {
  family: GeoEngineFamily | null;
  timeseriesPoints?: readonly GeoTimeseriesPoint[];
  promptResults?: readonly GeoPromptResult[];
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
  promptResults: GeoPromptResult[];
  promptCount: number;
  isScanning: boolean;
  journeys: GeoJourney[];
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

export interface GeoRangeControl extends GeoRangeState {
  label: string;
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
  loading?: boolean;
  pagination?: TablePaginationState;
}

export interface PurposeBadgeProps {
  category: string;
  compact?: boolean;
  tooltip?: boolean;
}

export interface GeoTrafficSourceGroup extends GeoTrafficSourceGroupDefinition {
  visitorType: GeoVisitorType;
  visits: number;
  markdownVisits: number;
  paths: number;
  lastSeenAt: string;
  categories: string[];
  members: GeoTrafficSource[];
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

export interface TrafficBreakdownCardProps {
  icon: ReactNode;
  title: string;
  aside?: ReactNode;
  align?: "start" | "center" | "end";
  children: ReactNode;
  onPointerEnter?: PointerEventHandler<HTMLDivElement>;
  onPointerLeave?: PointerEventHandler<HTMLDivElement>;
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
  variant?: "command" | "panel";
  label?: string;
  onCopy?: () => void;
}

export interface CopyCodeButtonProps {
  code: string;
  label: string;
  onCopy?: () => void;
}

export interface GeoSettingsFormProps {
  organizationId: string;
  settings: GeoSettings | null;
  catalog: GeoModelCatalog;
  promptCount?: number;
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

export type GeoFlagState = "enabled" | "disabled" | "unavailable";

export interface GeoLanguagePickerProps {
  selected: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
  labeled?: boolean;
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

export interface ShareOfVoiceOtherSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  other: ShareOfVoiceRow;
  others: readonly ShareOfVoiceRow[];
  competitors?: GeoCompetitor[];
  companyName?: string | null;
  aliases?: readonly string[];
  onBrandClick?: (row: ShareOfVoiceRow) => void;
  onBrandPointerEnter?: (row: ShareOfVoiceRow) => void;
  onTrackBrand?: (brand: string) => void;
}

export interface ShareOfVoiceDonutProps {
  points: GeoCompetitorSharePoint[];
  competitors?: GeoCompetitor[];
  limit?: number;
  isScanning?: boolean;
  onSliceClick?: (row: ShareOfVoiceRow) => void;
  onSlicePointerEnter?: (row: ShareOfVoiceRow) => void;
  companyName?: string | null;
  aliases?: readonly string[];
  organizationId?: string;
}

export interface CompetitorShareCardProps {
  points: GeoCompetitorSharePoint[];
  companyName: string | null;
  aliases?: readonly string[];
  competitors?: GeoCompetitor[];
  isScanning?: boolean;
  organizationSlug?: string;
  organizationId?: string;
}

export interface CompetitorEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  competitor: GeoCompetitor | null;
  initialName?: string;
}

export interface CompetitorEditFormProps {
  organizationId: string;
  competitor: GeoCompetitor | null;
  initialName?: string;
  onDone: () => void;
  onCancel?: () => void;
}

export interface CompetitorPromptSummaryStripProps {
  summary: GeoCompetitorPromptSummary;
}

export interface ScanPreflightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
  promptCount: number;
  engines: readonly string[];
  languages: readonly string[];
  lastScanAt: string | null;
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
}

export interface PromptsTableProps {
  organizationId: string;
  prompts: GeoTrackedPrompt[];
  results: GeoPromptResult[];
  isScanning?: boolean;
}

export type PromptAddMode = "write" | "website";

export interface PromptAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
}

export interface PromptDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: GeoPromptTableRow | null;
  isScanning?: boolean;
  surface?: GeoPromptDetailSurface;
  organizationId?: string;
  /** Engine to show first; falls back to the first result when absent. */
  initialEngine?: string | null;
}

export interface PromptAnswerPageProps {
  row: GeoPromptTableRow;
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
  prompt: string;
  result: GeoPromptResult;
  history: GeoPromptHistoryCheck[];
  isHistoryLoading: boolean;
  /** Tracked competitors, used to resolve brand logos by domain. */
  competitors?: readonly GeoCompetitor[];
  /** Opens the answer captured by one scan from the history. */
  onSelectCheck?: (check: GeoPromptHistoryCheck) => void;
}

export interface PromptReceiptHistoryProps {
  entries: PromptHistoryEntry[];
  isLoading: boolean;
  /** Tracked competitors, used to resolve brand logos by domain. */
  competitors?: readonly GeoCompetitor[];
  /** Opens the answer captured by one scan. Rows become clickable when set. */
  onSelect?: (check: GeoPromptHistoryCheck) => void;
}

export interface GeoAnswerActionsProps {
  text: string;
  sources: readonly GeoAnswerSource[];
}

export interface GeoPromptAnswerThreadProps {
  prompt: string;
  result: GeoPromptResult;
}

export interface CompetitorLogoProps {
  name: string;
  domain: string | null;
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

export interface GeoTableSkeletonProps {
  rows: number;
  toolbar?: ReactNode;
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
  rows: readonly GeoTrafficTrendRow[];
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
  config: ChartConfig;
  series: readonly TrafficTrendSeries[];
  hiddenKeys: ReadonlySet<string>;
  onToggle: (key: string) => void;
}

export interface TrafficSourcesGroupProps {
  visitorType: GeoVisitorType;
  groups: GeoTrafficSourceGroup[];
  columns: TableColumn<GeoTrafficSourceGroup>[];
  collapsed: boolean;
  onToggle: () => void;
  stacked: boolean;
}

export interface TrafficMarkdownCellProps {
  markdownVisits: number;
  visits: number;
}

export interface WhatChangedCardProps {
  organizationId: string;
  organizationSlug: string;
  promptResults?: readonly GeoPromptResult[];
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

export interface GeoChangeDetail {
  title: string;
  engine: string;
  before: string;
  after: string;
  note: string | null;
}

export interface GeoChangeCellProps {
  event: GeoChangeEvent;
}

export interface GeoChangeCompetitorsCellProps extends GeoChangeCellProps {
  competitors: readonly GeoCompetitor[];
}
