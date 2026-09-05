import type { AgentTokenUsage } from "@notra/ai/types/agents";
import type { ContentBillingReservation } from "@notra/ai/types/billing";
import type { GeoLogEventName } from "@notra/ai/types/evlog";
import type {
  GeoContentBrief,
  GeoContentSubtype,
} from "@notra/ai/types/geo-writer";
import type {
  GeoCheckGrounding,
  GeoCheckSourceItem,
  GeoCheckWrite,
} from "@notra/db/types/geo-checks";
import type { GeoContentBriefStatus } from "@notra/db/types/geo-writer";
import type {
  FinishReason,
  LanguageModel,
  LanguageModelUsage,
  ToolSet,
} from "ai";

export interface GeoProject {
  id: string;
  name: string;
  brandSettingsId: string;
  createdAt: string;
}

export interface GeoProjectRow {
  id: string;
  organizationId: string;
  name: string;
  brandSettingsId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GeoProjectsResponse {
  projects: GeoProject[];
}

export interface GeoProjectScope {
  organizationId: string;
  projectId: string | null;
  brandSettingsId: string | null;
  includeUnassigned: boolean;
}

export interface GeoScopeInput {
  organizationId: string;
  projectId?: string;
}

export interface GeoProjectUpdateInput {
  name?: string;
  brandSettingsId?: string;
}

export interface GeoSettings {
  id: string;
  organizationId: string;
  projectId: string;
  companyName: string;
  aliases: string[];
  competitors: string[];
  conversionPaths: string[];
  languages: string[];
  engines: string[];
  /** ZDR add-on: request zero data retention from every model host. */
  enforceZdr: boolean;
  /** Models without a ZDR host the user approved to run anyway. */
  nonZdrApprovedEngines: string[];
  pausedAutoPromptIds: string[];
  enabled: boolean;
  scanIntervalHours: number;
  scanStartedAt: string | null;
  lastScanAt: string | null;
  isScanning: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GeoSettingsResponse {
  configured: boolean;
  settings: GeoSettings | null;
}

export interface GeoSettingsRow {
  id: string;
  organizationId: string;
  projectId: string;
  companyName: string;
  aliases: string[];
  competitors: string[];
  conversionPaths: string[];
  languages: string[] | null;
  engines: string[] | null;
  enforceZdr: boolean;
  nonZdrApprovedEngines: string[];
  pausedAutoPromptIds: string[];
  enabled: boolean;
  scanIntervalHours: number;
  nextScanAt: Date | null;
  scanStartedAt: Date | null;
  lastScanAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GeoOverviewEngine {
  engine: string;
  checks: number;
  mentions: number;
  mentionRate: number;
  avgPosition: number | null;
  lastCheckedAt: string;
}

export interface GeoOverviewResponse {
  configured: boolean;
  engines: GeoOverviewEngine[];
}

export interface GeoTimeseriesPoint {
  day: string;
  engine: string;
  checks: number;
  mentions: number;
  avgPosition?: number | null;
}

export type GeoStatDeltaKind = "rate" | "mentions" | "position";

export type GeoStatDeltaTone = "up" | "down" | "flat";

export interface EngineFamilyStatTrends {
  ratePts: number | null;
  mentionDelta: number | null;
  positionDelta: number | null;
}

export interface GeoGenerateTrace {
  text?: string;
  sources?: readonly unknown[];
  toolCalls?: readonly unknown[];
  toolResults?: readonly unknown[];
  providerMetadata?: unknown;
  steps?: readonly unknown[];
}

export interface GeoEngineAnswer {
  text: string;
  grounding: GeoCheckGrounding;
  sources: GeoCheckSourceItem[];
  finishReason: FinishReason | null;
  usage?: LanguageModelUsage;
  /** Whether the call ran with ZDR enforced; null when the route did not say. */
  zdrEnforced: boolean | null;
}

export interface GeoGroundedAnswer extends GeoEngineAnswer {
  usage: LanguageModelUsage;
}

export interface GeoCheckOutcome {
  row: GeoCheckWrite | null;
  usage: AgentTokenUsage;
}

export interface GeoSequenceCheckOutcome {
  rows: GeoCheckWrite[];
  usage: AgentTokenUsage;
  droppedTurns: number;
}

export type GeoCheckFailureReason =
  | "empty_answer"
  | "engine_error"
  | "judge_error"
  | "translation_error";

export type GeoScanSkipReason =
  | "billing"
  | "zdr"
  | "disabled"
  | "claim_lost"
  | "superseded"
  | "already_running"
  | "scoped_prompts_missing";

export interface GeoErrorFields {
  errorName: string;
  errorMessage: string;
  causeName?: string;
  causeMessage?: string;
  finishReason?: FinishReason | null;
  usage?: LanguageModelUsage;
}

export interface GeoSkipFields extends Record<string, unknown> {
  event?: GeoLogEventName;
}

export interface GeoEngineAttemptSummary {
  engine: string;
  attempted: number;
  failed: number;
}

export interface GeoTimeseriesResponse {
  configured: boolean;
  points: GeoTimeseriesPoint[];
}

export type GeoSparklineMode = "all" | "search" | "memory";

export type GeoEngineMode = Exclude<GeoSparklineMode, "all">;

export interface MentionRateSparklineOptions {
  family?: string;
  model?: string;
  mode?: GeoSparklineMode;
}

export interface GeoSparklinePoint {
  day: string;
  value: number;
}

export interface EngineFamilyModeTrendRow {
  day: string;
  rawDay: string;
  all: number | null;
  search: number | null;
  memory: number | null;
  [key: string]: string | number | null;
}

export interface GeoAnswerSource {
  title: string;
  url: string;
  domain: string;
}

export interface GeoPromptResult {
  promptId: string;
  engine: string;
  prompt: string;
  answer: string;
  mentioned: boolean;
  position: number | null;
  sentiment: string | null;
  competitors: string[];
  excerpt: string;
  searchQueries: string[];
  sources: GeoAnswerSource[];
  finishReason: string | null;
  promptTokens: number | null;
  outputTokens: number | null;
  reasoningTokens: number | null;
  truncated: boolean | null;
  lastCheckedAt: string;
}

export interface GeoPromptResultsResponse {
  configured: boolean;
  results: GeoPromptResult[];
}

export interface GeoPromptHistoryInput extends GeoScopeInput {
  promptId: string;
}

export interface GeoPromptRescanInput extends GeoScopeInput {
  promptId: string;
}

export interface GeoRescanForPostInput {
  organizationId: string;
  postId: string;
}

export type GeoPostRescanStatus = "started" | "deferred" | "skipped";

export interface GeoPostRescanOutcome {
  status: GeoPostRescanStatus;
  scanId: string | null;
}

export interface GeoPromptHistoryCheck {
  id: string;
  scanId: string;
  engine: string;
  mentioned: boolean;
  position: number | null;
  sentiment: string | null;
  competitors: string[];
  answer: string;
  excerpt: string;
  searchQueries: string[];
  sources: GeoAnswerSource[];
  language: string;
  capturedAt: string;
}

export interface GeoPromptHistoryResponse {
  configured: boolean;
  promptId: string;
  checks: GeoPromptHistoryCheck[];
}

export type GeoPromptReceiptView = "analysis" | "raw";

export interface GeoCompetitorSharePoint {
  brand: string;
  mentions: number;
  trend?: GeoSparklinePoint[];
}

export interface GeoCompetitorShareTimeseriesPoint {
  brand: string;
  day: string;
  mentions: number;
}

export interface GeoCompetitorShareResponse {
  configured: boolean;
  points: GeoCompetitorSharePoint[];
  timeseries: GeoCompetitorShareTimeseriesPoint[];
}

export interface GeoSettingsUpsertInput {
  organizationId: string;
  projectId?: string;
  companyName: string;
  aliases: string[];
  competitors: string[];
  conversionPaths?: string[];
  languages: string[];
  engines: string[];
  enforceZdr: boolean;
  nonZdrApprovedEngines: string[];
  pausedAutoPromptIds?: string[];
  enabled: boolean;
  scanIntervalHours: number;
}

export interface GeoSettingsEngineAddInput extends GeoScopeInput {
  engine: string;
}

export interface GeoSettingsLanguageAddInput extends GeoScopeInput {
  language: string;
}

export interface GeoScanCronSweepResult {
  due: number;
  started: number;
  skipped: number;
  staleScansFailed: number;
}

export interface GeoSampleDataResponse {
  projectId: string;
  promptsAdded: number;
  competitorsAdded: number;
  sequencesAdded: number;
  mentionChecks: number;
  trafficEvents: number;
  analyticsIngested: boolean;
}

export interface GeoSampleDataClearResponse {
  cleared: boolean;
  analyticsCleared: boolean;
}

export type GeoPromptSource = "custom" | "auto";

export type GeoPromptIntent =
  | "comparison"
  | "list"
  | "how_to"
  | "question"
  | "other";

export interface GeoPromptIntentRule {
  intent: Exclude<GeoPromptIntent, "other">;
  pattern: RegExp;
}

export interface GeoTrackedPrompt {
  id: string;
  prompt: string;
  enabled: boolean;
  source: GeoPromptSource;
  tags: string[];
  createdAt: string | null;
}

export interface GeoPromptRow {
  id: string;
  organizationId: string;
  projectId: string;
  prompt: string;
  tags: string[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GeoPromptUpdateChanges {
  enabled?: boolean;
  tags?: string[];
}

export interface GeoAutoPromptToggleResult {
  promptId: string;
  enabled: boolean;
  pausedAutoPromptIds: string[];
}

export interface GeoTrackedPromptsResponse {
  configured: boolean;
  prompts: GeoTrackedPrompt[];
}

export interface GeoPromptSequence {
  id: string;
  name: string;
  steps: string[];
  enabled: boolean;
  createdAt: string;
}

export interface GeoPromptSequenceRow {
  id: string;
  organizationId: string;
  projectId: string;
  name: string;
  steps: string[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GeoSequencesResponse {
  sequences: GeoPromptSequence[];
}

export interface GeoSequenceCreateInput {
  id?: string;
  name: string;
  steps: string[];
}

export interface GeoSequenceUpdateInput {
  sequenceId: string;
  name?: string;
  steps?: string[];
  enabled?: boolean;
}

export interface GeoSequenceTurnResult {
  sequenceId: string;
  turn: number;
  engine: string;
  prompt: string;
  answer: string;
  mentioned: boolean;
  position: number | null;
  sentiment: string | null;
  excerpt: string;
  searchQueries: string[];
  sources: GeoAnswerSource[];
  finishReason: string | null;
  promptTokens: number | null;
  outputTokens: number | null;
  reasoningTokens: number | null;
  truncated: boolean | null;
  lastCheckedAt: string;
}

export interface GeoSequenceRunResponse {
  checks: number;
  mentions: number;
  engines: string[];
}

export interface GeoSequenceResultsResponse {
  configured: boolean;
  results: GeoSequenceTurnResult[];
}

export interface GeoScanResult {
  status: "completed" | "skipped" | "invalid_payload";
  checks?: number;
  mentions?: number;
}

export interface GeoScanPlannedTask {
  engine: string;
  groundedKey: string | null;
  prompt: GeoPromptDefinition;
  language: string;
  zdr: GeoZdrMode;
}

export interface GeoScanPlannedSequence {
  sequenceId: string;
  steps: string[];
  engine: string;
  groundedKey: string | null;
  zdr: GeoZdrMode;
}

export interface GeoScanPlannedPersona {
  personaId: string;
  engine: string;
  groundedKey: string;
  zdr: GeoZdrMode;
}

export interface GeoScanProjectContext {
  organizationId: string;
  projectId: string;
  scanId: string;
  runId: string;
  companyName: string;
  aliases: string[];
  gate: ContentBillingReservation;
  startedAtMs: number;
}

export interface GeoScanProjectPlan {
  context: GeoScanProjectContext;
  /** ISO stamp of the claim token the batches rotate as they renew it. */
  claimedAt: string;
  tasks: GeoScanPlannedTask[];
  sequences: GeoScanPlannedSequence[];
  personas: GeoScanPlannedPersona[];
  promptCount: number;
  languages: string[];
  engines: string[];
}

export type GeoScanProjectPlanResult =
  | { status: "planned"; plan: GeoScanProjectPlan }
  | { status: "skipped"; reason: GeoScanSkipReason };

export interface GeoScanBatchOutcome {
  checks: number;
  mentions: number;
  dropped: number;
  usage: AgentTokenUsage;
  /** Renewed claim token the next batch must use. */
  claimedAt: string;
}

export interface GeoScanProjectTotals {
  checks: number;
  mentions: number;
  dropped: number;
  usage: AgentTokenUsage;
}

export interface GeoScanProgramOptions {
  projectId?: string;
  claimedAt?: Date;
  scanId?: string;
  /** Explicit project subset for a retry pass; overrides `projectId` scoping. */
  projectIds?: readonly string[];
  promptIds?: readonly string[];
}

export interface GeoProjectScanOutcome {
  checks: number;
  mentions: number;
  usage: AgentTokenUsage;
}

export interface GeoPromptDefinition {
  id: string;
  text: string;
}

export interface GeoCheckTask {
  engine: string;
  grounded: GeoGroundedEngine | null;
  prompt: GeoPromptDefinition;
  language: string;
  zdr: GeoZdrMode;
}

/** Log context for the scan-time ZDR entitlement re-check. */
export interface GeoScanZdrPolicyFields {
  projectId: string;
  scanId?: string;
  sequenceId?: string;
  personaId?: string;
}

/** Per-project ZDR inputs needed to decide how an engine may run. */
export interface GeoZdrPolicy {
  enforceZdr: boolean;
  nonZdrApprovedEngines: readonly string[];
  /**
   * Mode for engines when ZDR is not enforced. Defaults to `preferred`;
   * organizations without the ZDR add-on get `none`.
   */
  nonEnforcedMode?: GeoZdrMode;
}

/** Engine a scan will actually call after ZDR skip/fallback. */

export interface GeoCheckContext {
  catalog: GeoModelCatalog;
  organizationId: string;
  projectId: string;
  scanId: string;
  capturedAt: Date;
  companyName: string;
  aliases: string[];
}

export interface GeoSequenceDefinition {
  id: string;
  steps: string[];
}

export interface GeoBrandContext {
  companyDescription: string | null;
  audience: string | null;
}

export interface MentionTrendRow {
  day: string;
  rawDay: string;
  [engine: string]: string | number | null;
}

export interface MentionTrend {
  rows: MentionTrendRow[];
  engines: string[];
}

export interface FamilyDayBucket {
  mentions: number;
  checks: number;
  positionWeighted: number;
  positionWeight: number;
}

export type GeoGroundedProvider =
  | "gateway-openai"
  | "gateway-anthropic"
  | "gateway-google"
  | "direct-openai"
  | "direct-anthropic"
  | "direct-perplexity";

export interface GeoGroundedEngine {
  key: string;
  label: string;
  model: string;
  provider: GeoGroundedProvider;
  /**
   * ZDR coverage when the catalog has no entry for `model`. Direct vendor
   * SDK engines bypass the router and can never honour ZDR.
   */
  zdr: GeoModelZdr;
  envVar: string | null;
  isAvailable: () => boolean;
}

export type GeoGroundedProviderConfig = Pick<
  GeoGroundedEngine,
  "provider" | "zdr" | "envVar" | "isAvailable"
>;

export interface GeoGroundedInvocation {
  model: LanguageModel;
  tools: ToolSet;
}

export interface GeoGroundedInvocationOptions {
  organizationId?: string;
  zdr?: GeoZdrMode;
}

export interface GeoDiscoveredPrompt {
  prompt: string;
  title: string;
}

export interface GeoWebsiteDiscovery {
  companyName: string;
  aliases: string[];
  competitors: GeoCompetitorSeed[];
  prompts: GeoDiscoveredPrompt[];
}

export interface GeoGenerateFromWebsiteResult {
  companyName: string;
  aliases: string[];
  competitors: string[];
  promptsAdded: number;
}

export interface GeoDiscoverWebsiteResult {
  url: string;
  discovery: GeoWebsiteDiscovery;
}

export type GeoOnboardingStage = "brand" | "competitors" | "complete";

export interface GeoOnboardingBrandInput {
  organizationId: string;
  projectId?: string;
  companyName: string;
  aliases: string[];
  prompts: GeoDiscoveredPrompt[];
  languages?: string[];
  engines?: string[];
  enforceZdr?: boolean;
  nonZdrApprovedEngines?: string[];
}

export interface GeoOnboardingBrandResult {
  projectId: string;
  companyName: string;
  promptsAdded: number;
}

export interface GeoCompetitorSuggestion {
  name: string;
  domain: string | null;
  description: string | null;
  confidence: "high" | "medium" | null;
}

export interface GeoCompetitorSuggestionsResponse {
  domain: string;
  field: string | null;
  competitors: GeoCompetitorSuggestion[];
}

export interface GeoBrandSearchResult {
  domain: string;
  name: string;
  logo: string | null;
}

export interface GeoBrandSearchResponse {
  results: GeoBrandSearchResult[];
}

export interface GeoJudgeResult {
  mentioned: boolean;
  position: number | null;
  sentiment: "positive" | "neutral" | "negative" | null;
  competitors: string[];
  excerpt: string;
}

export type GeoVisitorType = "crawler" | "ai_referral" | "human" | "unknown";

export interface GeoCliClientPattern {
  pattern: string;
  agent: string;
}

export interface GeoAcceptFingerprint {
  agent: string;
  userAgentPattern: string;
  accept: string;
}

export interface GeoTrafficSource {
  source: string;
  visitorType: GeoVisitorType;
  agent: string;
  category: string;
  confidence: string;
  visits: number;
  previousVisits?: number;
  markdownVisits: number;
  paths: number;
  lastSeenAt: string;
}

export interface GeoTrafficPoint {
  day: string;
  visitorType: GeoVisitorType;
  source: string;
  visits: number;
}

export interface GeoTrafficTrendRow {
  day: string;
  rawDay: string;
  crawler: number;
  aiReferral: number;
  [key: string]: string | number;
}

export interface GeoTrafficLogEntry {
  capturedAt: string;
  visitorType: GeoVisitorType;
  source: string;
  agent: string;
  category: string;
  confidence: string;
  path: string;
  host: string;
  country: string;
  ua: string;
  journeyId: string;
  wantsMarkdown: boolean;
}

export type GeoTrafficLogVisitorFilter = "crawler" | "ai_referral";

export type GeoTrafficLogPurposeFilter =
  | "training-crawler"
  | "search-index"
  | "assistant-browse";

export interface GeoTrafficLogVisitorOption {
  value: GeoTrafficLogVisitorFilter;
  label: string;
}

export interface GeoTrafficLogPurposeOption {
  value: GeoTrafficLogPurposeFilter;
  label: string;
}

export interface GeoTrafficLogFilters {
  visitorTypes: GeoTrafficLogVisitorFilter[];
  categories: GeoTrafficLogPurposeFilter[];
}

export interface GeoTrafficLogResponse {
  configured: boolean;
  log: GeoTrafficLogEntry[];
  total: number;
}

export type GeoJourneyPathKind = "home" | "docs" | "blog" | "search" | "page";

export interface GeoJourney {
  journeyId: string;
  source: string;
  visitorType: GeoVisitorType;
  pages: number;
  distinctPaths: number;
  firstSeenAt: string;
  lastSeenAt: string;
  samplePaths: string[];
}

export interface GeoTrafficJourneysResponse {
  configured: boolean;
  journeys: GeoJourney[];
}

export interface GeoJourneyEvent {
  capturedAt: string;
  path: string;
  host: string;
  method: string;
  referer: string;
  country: string;
  agent: string;
  category: string;
}

export interface GeoJourneyDetailResponse {
  configured: boolean;
  events: GeoJourneyEvent[];
}

export interface GeoTrafficTotals {
  crawler: number;
  cited: number;
  aiReferral: number;
  conversions: number | null;
}

export interface GeoConversionPageVisit {
  path: string;
  visits: number;
  previousVisits?: number;
}

export interface GeoConversionTotals {
  conversions: number;
  previousConversions: number | null;
}

export type GeoTrafficFunnelStageKey = keyof GeoTrafficTotals;

export interface GeoTrafficFunnelStage {
  key: GeoTrafficFunnelStageKey;
  label: string;
  description: string;
}

export interface TrafficMetricDeltas {
  crawler: number | null;
  aiReferral: number | null;
  total: number | null;
}

export interface AiTrafficResponse {
  configured: boolean;
  totals: GeoTrafficTotals;
  previousConversions: number | null;
  sources: GeoTrafficSource[];
  points: GeoTrafficPoint[];
}

export interface GeoTrafficPage {
  path: string;
  source: string;
  visitorType: GeoVisitorType;
  visits: number;
  previousVisits?: number;
  lastSeenAt: string;
}

export interface GeoTrafficPagesResponse {
  configured: boolean;
  pages: GeoTrafficPage[];
}

export type GeoIngestFramework = "next" | "nuxt" | "netlify";

export type GeoIngestPackageManager = "bun" | "pnpm" | "yarn" | "npm";

/** Install snippet per supported framework. */
export type GeoIngestSnippets = Record<GeoIngestFramework, string>;

/** Who a verified tracking token belongs to. */
export interface GeoIngestIdentity {
  organizationId: string;
  projectId: string | null;
  generation: number;
}

/** Everything needed to install tracking except the token itself. */
export interface GeoIngestSetupInfo {
  ingestUrl: string;
  snippet: string;
  snippets: GeoIngestSnippets;
}

export interface GeoIngestSetupResponse extends GeoIngestSetupInfo {
  token: string;
}

export type GeoPresenceStatus =
  | "training-data"
  | "retrieval-only"
  | "invisible";

export interface GeoEngineVariant {
  model: string;
  web: GeoOverviewEngine | null;
  raw: GeoOverviewEngine | null;
}

export interface GeoEngineFamily {
  family: string;
  variants: GeoEngineVariant[];
}

export interface GeoEngineFamilyTotals {
  mentions: number;
  checks: number;
  rate: number;
}

export interface MentionProviderRow {
  family: GeoEngineFamily;
  totals: GeoEngineFamilyTotals;
  mentionDelta: number | null;
  tracked: boolean;
}

export interface GeoLanguageSharePoint {
  language: string;
  checks: number;
  mentions: number;
  mentionRate: number;
  avgPosition: number | null;
  trend?: GeoSparklinePoint[];
}

export interface LanguagePerformanceTrackedRow extends GeoLanguageSharePoint {
  kind: "tracked";
}

export interface LanguagePerformanceSuggestedRow {
  kind: "suggested";
  language: string;
}

export type LanguagePerformanceRow =
  | LanguagePerformanceTrackedRow
  | LanguagePerformanceSuggestedRow;

export interface GeoLanguageShareResponse {
  configured: boolean;
  points: GeoLanguageSharePoint[];
}

export interface GeoPromptSummary {
  promptId: string;
  prompt: string;
  mentioned: number;
  total: number;
  bestPosition: number | null;
  presence: GeoPresenceStatus | null;
  results: GeoPromptResult[];
}

export type GeoTab = "visibility" | "prompts" | "journeys";

export type GeoRangePreset =
  | "today"
  | "yesterday"
  | "7d"
  | "14d"
  | "30d"
  | "90d"
  | "ytd";

export interface GeoWindowInput {
  days?: number;
  from?: string;
  to?: string;
}

export interface GeoTrafficSourceGroupDefinition {
  key: string;
  label: string;
  icon: string | null;
}

export type EngineIconKey =
  | "openai"
  | "claude"
  | "gemini"
  | "google"
  | "amazon"
  | "perplexity"
  | "mistral"
  | "deepseek"
  | "meta"
  | "grok"
  | "qwen"
  | "copilot"
  | "tencent"
  | "xiaomi"
  | "cursor"
  | "apple"
  | "duckduckgo"
  | "cloudflare"
  | "tiktok"
  | "mozilla"
  | "manus"
  | "firecrawl"
  | "cohere"
  | "opencode"
  | "kimi"
  | "zai"
  | "exa"
  | "parallel"
  | "commoncrawl"
  | "youcom"
  | "liner"
  | "cline"
  | "devin"
  | "diffbot"
  | "tavily"
  | "timpi"
  | "huawei"
  | "kagi"
  | "agent"
  | "cli";

export type GeoChatSkin =
  | "claude"
  | "chatgpt"
  | "gemini"
  | "perplexity"
  | "opencode";

export interface EngineIconRule {
  key: EngineIconKey;
  patterns: readonly string[];
  /** Values that must equal the whole engine string, for short vendor names. */
  exact?: readonly string[];
}

export type GeoModelProviderId =
  | "anthropic"
  | "openai"
  | "google"
  | "moonshotai"
  | "meta"
  | "zai"
  | "spacexai"
  | "deepseek"
  | "mistral"
  | "cursor"
  | "opencode";

/** Zero-data-retention coverage as reported by the Vercel AI Gateway feed. */
export type GeoModelZdr = "all" | "some" | "none";

/**
 * Where a model is served. `cursor` runs through the Cursor SDK and `box`
 * through OpenCode in Upstash Box instead of the AI router.
 */
export type GeoModelGateway = "vercel" | "openrouter" | "cursor" | "box";

export interface GeoModelProvider {
  id: GeoModelProviderId;
  label: string;
  /** Key into GEO_BRAND_LABELS / icon rules. */
  brand: string;
  /** Featured providers are visible without expanding "more providers". */
  featured: boolean;
}

export interface GeoModelCatalogEntry {
  id: string;
  provider: GeoModelProviderId;
  label: string;
  zdr: GeoModelZdr;
  /** ISO date (YYYY-MM-DD). */
  released: string;
  /** Part of the default engine set for new projects. */
  default: boolean;
  /** Gateways that serve the model; OpenRouter-only models are pinned. */
  gateways: readonly GeoModelGateway[];
}

export interface GeoModelCatalog {
  providers: GeoModelProvider[];
  models: GeoModelCatalogEntry[];
}

/** One model as published by the Vercel AI Gateway feed. */
export interface GeoGatewayModel {
  id: string;
  name: string;
  owned_by: string;
  type: string;
  zdr: GeoModelZdr;
  released?: number;
  deprecated_at?: number | string | null;
  tags?: string[];
}

/** How strictly a scan asks the router for zero data retention. */
export type GeoZdrMode = "required" | "preferred" | "none";

/** Result of a ZDR entitlement lookup; `unknown` means billing did not answer. */
export type GeoZdrEntitlement = "entitled" | "not_entitled" | "unknown";

export interface ShareOfVoiceRow {
  brand: string;
  mentions: number;
  share: number;
  trend: GeoSparklinePoint[];
  tracked: boolean;
}

export interface ShareOfVoiceBreakdown {
  rows: ShareOfVoiceRow[];
  others: ShareOfVoiceRow[];
}

export interface ShareOfVoiceDonutSlice extends ShareOfVoiceRow {
  slice: string;
  [key: string]: unknown;
}

export type GeoCompetitorKind = "direct" | "indirect";

export interface GeoCompetitor {
  id: string;
  name: string;
  domain: string | null;
  synonyms: string[];
  kind: GeoCompetitorKind;
  color: string | null;
}

export interface GeoCompetitorSeed {
  name: string;
  domain: string | null;
  synonyms?: string[];
  kind?: GeoCompetitorKind;
  color?: string | null;
}

export interface GeoCompetitorRow {
  id: string;
  organizationId: string;
  name: string;
  domain: string | null;
  synonyms: string[];
  kind: GeoCompetitorKind;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type GeoCompetitorMerge = (
  current: GeoCompetitor[]
) => readonly GeoCompetitorSeed[];

export type GeoCompetitorReconcileOutcome =
  | { status: "limit" }
  | { status: "ok"; competitors: GeoCompetitor[] };

export interface GeoPromptInsert {
  prompt: string;
  title?: string | null;
  enabled?: boolean;
}

export interface GeoInsertedPrompt {
  id: string;
  prompt: string;
}

export interface GeoCompetitorsResponse {
  competitors: GeoCompetitor[];
}

export interface GeoCompetitorUpsertInput {
  name: string;
  previousName?: string;
  domain: string | null;
  synonyms?: string[];
  kind?: GeoCompetitorKind;
  color?: string | null;
}

export interface GeoCompetitorTimeseriesPoint {
  day: string;
  mentions: number;
  checks: number;
}

export interface GeoCompetitorPromptRow {
  promptId: string;
  prompt: string;
  engine: string;
  capturedAt: string;
  mentioned: boolean;
  position: number | null;
}

export interface GeoCompetitorPromptSummary {
  mentioned: number;
  total: number;
  bestPosition: number | null;
  engines: number;
}

export interface GeoCompetitorDetailResponse {
  configured: boolean;
  points: GeoCompetitorTimeseriesPoint[];
  prompts: GeoCompetitorPromptRow[];
}

export type GeoCompetitorTypeFilter = "all" | GeoCompetitorKind;

export interface GeoSuggestionKeyword {
  query: string;
  clicks: number;
  impressions: number;
  position: number;
}

// --- GEO writer ---

export type GeoWriterSourceKind =
  | "manual"
  | "gap"
  | "prompt"
  | "search_console";

export interface GeoWriterPlanInput {
  topic: string;
  autoApprove: boolean;
  contentSubtype?: GeoContentSubtype;
  brandVoiceIds?: string[];
  competitorIds?: string[];
  sitemapId?: string;
  sourceKind?: GeoWriterSourceKind;
  sourceId?: string;
  existingPageUrl?: string;
}

export interface GeoPromptEvidenceEngine {
  engine: string;
  mentioned: boolean;
  position: number | null;
  sentiment: string | null;
  competitors: string[];
  excerpt: string;
  queries: string[];
  sourceDomains: string[];
  capturedAt: string;
}

export interface GeoPromptEvidence {
  sourcePromptId: string;
  prompt: string;
  mentionedEngines: number;
  totalEngines: number;
  engines: GeoPromptEvidenceEngine[];
  competitorMentions: Array<{ name: string; engines: number }>;
  citedDomains: Array<{ domain: string; engines: number }>;
  capturedAt: string | null;
}

export interface GeoWriterPlanResponse {
  briefId: string;
  brief: GeoContentBrief;
  status: GeoContentBriefStatus;
  runId: string | null;
  postId: string | null;
}

export interface GeoWriterUpdateInput {
  briefId: string;
  expectedUpdatedAt: string;
  markdown: string;
  workingTitle?: string;
}

export type GeoGapWriteAction = "write" | "review" | "writing" | "open";

export interface GeoGapBriefBaseline {
  mentionedEngines: number;
  totalEngines: number;
}

export interface GeoGapBriefRef {
  briefId: string;
  status: GeoContentBriefStatus;
  postId: string | null;
  workingTitle: string | null;
  publishedAt: string | null;
  baseline: GeoGapBriefBaseline | null;
  rescanned: boolean;
}

export interface GeoGapOpportunityInput {
  ownMentionRate: number;
  competitorCount: number;
  engineCoverage: number;
}

export interface GeoPromptGapRow {
  id: string;
  prompt: string;
  title: string | null;
  engines: string[];
  mentionedEngines: string[];
  competitors: string[];
  discoveredCompetitors: string[];
  ownMentionRate: number;
  engineCoverage: number;
  opportunity: number;
  won: boolean;
  brief: GeoGapBriefRef | null;
}

export interface GeoSearchGapRow {
  id: string;
  prompt: string;
  title: string | null;
  impressions: number | null;
  clicks: number | null;
  position: number | null;
  queries: GeoSuggestionKeyword[];
  brief: GeoGapBriefRef | null;
  recommendation: GeoSearchGapRecommendation;
}

export type GeoSearchGapAction = "create" | "update" | "merge" | "ignore";

export type GeoContentCollisionKind = "page" | "post";

export interface GeoContentCollisionCandidate {
  kind: GeoContentCollisionKind;
  id: string;
  url: string | null;
  title: string | null;
  slug: string | null;
}

export interface GeoContentCollisionMatch {
  kind: GeoContentCollisionKind;
  id: string;
  url: string | null;
  title: string;
  score: number;
}

export interface GeoContentCollisionGap {
  prompt: string;
  title: string | null;
  queries: readonly string[];
}

export interface GeoSearchGapRecommendationInput {
  matches: readonly GeoContentCollisionMatch[];
  impressions: number | null;
  clicks: number | null;
}

export interface GeoSearchGapRecommendation {
  action: GeoSearchGapAction;
  reason: string;
  targets: GeoContentCollisionMatch[];
}

export interface GeoContentGapsResponse {
  promptGaps: GeoPromptGapRow[];
  searchGaps: GeoSearchGapRow[];
  hasScanData: boolean;
}

export interface GeoWriterStartResponse {
  runId: string;
}

export interface GeoContentBriefDetail {
  id: string;
  topic: string;
  brief: GeoContentBrief;
  status: GeoContentBriefStatus;
  autoApproved: boolean;
  runId: string | null;
  postId: string | null;
  humanized: boolean;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface GeoContentBriefSummary {
  id: string;
  topic: string;
  workingTitle: string;
  status: GeoContentBriefStatus;
  postId: string | null;
  createdAt: string;
}

export interface GeoContentBriefsResponse {
  briefs: GeoContentBriefSummary[];
}

export interface GeoWriterPayload {
  organizationId: string;
  projectId: string;
  briefId: string;
  runId: string;
}

export type GeoChangeKind =
  | "gained_mention"
  | "lost_mention"
  | "position_improved"
  | "position_dropped"
  | "competitor_displaced"
  | "citation_added"
  | "citation_removed"
  | "new_engine";

export interface GeoChangeCheckState {
  mentioned: boolean;
  position: number | null;
}

export interface GeoScanCheckSnapshot extends GeoChangeCheckState {
  promptId: string;
  prompt: string;
  engine: string;
  competitors: string[];
  domains: string[];
}

export interface GeoChangeEvent {
  kind: GeoChangeKind;
  promptId: string;
  prompt: string;
  engine: string;
  previous: GeoChangeCheckState | null;
  current: GeoChangeCheckState;
  competitors: string[];
  domains: string[];
}

export interface GeoChangesSummary {
  gained: number;
  lost: number;
  positionImproved: number;
  positionDropped: number;
  citationsAdded: number;
  citationsRemoved: number;
}

export type GeoChangesSummaryGroupKey = "mentions" | "position" | "citations";

export interface GeoChangesSummaryGroup {
  key: GeoChangesSummaryGroupKey;
  label: string;
  up: keyof GeoChangesSummary;
  down: keyof GeoChangesSummary;
}

export interface GeoChangeScan {
  id: string;
  finishedAt: string | null;
}

export interface GeoChangesResponse {
  previousScan: GeoChangeScan | null;
  currentScan: GeoChangeScan | null;
  summary: GeoChangesSummary;
  events: GeoChangeEvent[];
}
