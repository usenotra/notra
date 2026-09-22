import type { ReactNode } from "react";

import type { ChartColorPair, ChartConfig, ChartMarker } from "@/types/charts";

export interface SocialAnalyticsSyncPayload {
  organizationId?: string;
}

export interface SocialAnalyticsSyncResult {
  status: "completed" | "skipped" | "invalid_payload";
  syncedAccounts?: number;
  syncedPosts?: number;
}

export interface SyncableSocialAccount {
  id: string;
  organizationId: string;
  provider: string;
  providerAccountId: string;
  username: string;
  displayName: string | null;
  profileImageUrl: string | null;
  verified: boolean;
}

export interface TwitterPublicMetrics {
  followers_count?: number;
  following_count?: number;
  tweet_count?: number;
  listed_count?: number;
}

export interface TwitterTweetPublicMetrics {
  retweet_count?: number;
  reply_count?: number;
  like_count?: number;
  quote_count?: number;
  bookmark_count?: number;
  impression_count?: number;
}

export interface TwitterBatchUser {
  id: string;
  username: string;
  name?: string;
  verified?: boolean;
  verified_type?: string;
  profile_image_url?: string;
  public_metrics?: TwitterPublicMetrics;
}

export interface TwitterBatchUsersResponse {
  data?: TwitterBatchUser[];
}

export interface TwitterUserByUsernameResponse {
  data?: TwitterBatchUser;
}

export interface ResolvedTwitterAccount {
  providerAccountId: string;
  username: string;
  displayName: string | null;
  profileImageUrl: string | null;
  verified: boolean;
  verifiedType: string | null;
  followersCount: number | null;
}

export interface TwitterTimelineTweet {
  id: string;
  text: string;
  created_at?: string;
  public_metrics?: TwitterTweetPublicMetrics;
}

export interface TwitterTimelineResponse {
  data?: TwitterTimelineTweet[];
  meta?: {
    next_token?: string;
  };
}

export interface RecordPublishedSocialPostInput {
  organizationId: string;
  accountId: string;
  provider: string;
  providerAccountId: string;
  platformPostId: string;
  url: string | null;
  content: string;
}

export interface SocialOverviewAccount {
  provider: string;
  providerAccountId: string;
  accountId: string;
  username: string;
  displayName: string | null;
  profileImageUrl: string | null;
  verified: boolean;
  followersCount: number | null;
  followingCount: number | null;
  postsCount: number | null;
  trackedPosts: number | null;
  impressions: number | null;
  likes: number | null;
  replies: number | null;
  reposts: number | null;
  quotes: number | null;
  bookmarks: number | null;
  statsCapturedAt: string | null;
}

export interface SocialOverviewResponse {
  configured: boolean;
  accounts: SocialOverviewAccount[];
}

export interface EngagementTimeseriesPoint {
  day: string;
  provider: string;
  providerAccountId: string;
  posts: number;
  impressions: number | null;
  likes: number | null;
  replies: number | null;
  reposts: number | null;
}

export interface EngagementTimeseriesResponse {
  configured: boolean;
  points: EngagementTimeseriesPoint[];
}

export interface TopPostItem {
  provider: string;
  platformPostId: string;
  providerAccountId: string;
  username: string | null;
  profileImageUrl: string | null;
  content: string;
  url: string | null;
  postedAt: string;
  impressions: number | null;
  likes: number | null;
  replies: number | null;
  reposts: number | null;
  bookmarks: number | null;
  engagement: number;
}

export interface TopPostsResponse {
  configured: boolean;
  posts: TopPostItem[];
}

export interface FollowerGrowthPoint {
  day: string;
  provider: string;
  providerAccountId: string;
  followersCount: number | null;
}

export interface FollowerGrowthResponse {
  configured: boolean;
  points: FollowerGrowthPoint[];
}

export interface FollowerChartRow {
  day: string;
  [accountKey: string]: string | number;
}

export interface AnalyticsStatCard {
  label: string;
  value: number | null;
  hint?: string;
}

export interface AnalyticsRangeOptions {
  days?: number;
  timezone?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface AnalyticsDateRange {
  dateFrom: string;
  dateTo: string;
}

export type AnalyticsRangePreset =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "90d"
  | "mtd"
  | "qtd"
  | "ytd"
  | "all"
  | "custom";

export interface AnalyticsRangeState {
  preset: AnalyticsRangePreset;
  range: AnalyticsDateRange;
}

export interface AnalyticsRangeControl extends AnalyticsRangeState {
  label: string;
  includesToday: boolean;
  setPreset: (preset: Exclude<AnalyticsRangePreset, "custom">) => void;
  setCustom: (range: AnalyticsDateRange) => void;
}

export interface AnalyticsNavProps {
  slug: string;
}

export interface PlatformTabItem {
  value: string;
  label: string;
  icon?: ReactNode;
  collapsedLabel?: string;
}

export interface PlatformTabsProps {
  items: PlatformTabItem[];
  value: string;
  onValueChange: (value: string) => void;
  label?: string;
  className?: string;
}

export interface AnalyticsContextValue {
  organizationId: string;
  organizationSlug: string;
  accounts: SocialOverviewAccount[];
  configured: boolean;
  isPending: boolean;
  hiddenKeys: Set<string>;
  toggleAccount: (key: string) => void;
}

export interface AnalyticsProviderProps {
  organizationSlug: string;
  children: ReactNode;
}

export interface AnalyticsAccountsView {
  organizationId: string;
  organizationSlug: string;
  accounts: SocialOverviewAccount[];
  configured: boolean;
  isPending: boolean;
  hiddenKeys: Set<string>;
  toggleAccount: (key: string) => void;
  allKeys: string[];
  accountConfig: ChartConfig;
  accountColors: Map<string, ChartColorPair>;
  visibleKeys: string[];
  selectedKeys: Set<string>;
  visibleAccounts: SocialOverviewAccount[];
}

export interface AnalyticsRangePickerProps {
  control: AnalyticsRangeControl;
}

export interface PostingPerformancePoint {
  weekday: number;
  hour: number;
  posts: number;
  engagement: number;
  impressions: number | null;
  avgEngagement: number;
}

export interface PostingPerformanceResponse {
  configured: boolean;
  points: PostingPerformancePoint[];
}

export type PostingActivityLevel = "quiet" | "low" | "medium" | "high";

export interface PostingTimeSlot {
  hour: number;
  posts: number;
  avgEngagement: number;
  level: PostingActivityLevel;
}

export interface BestPostingSlot {
  weekday: string;
  hour: number;
  posts: number;
  avgEngagement: number;
}

export interface AccountSeriesRow {
  day: string;
  rawDay: string;
  [accountKey: string]: string | number;
}

export interface NotraAdoptionResponse {
  configured: boolean;
  organizationCreatedAt: string | null;
  firstNotraPostAt: string | null;
  notraPosts: number;
}

export type LeaderboardWindow = 7 | 30;

export interface LeaderboardAccount {
  provider: string;
  providerAccountId: string;
  username: string;
  displayName: string | null;
  profileImageUrl: string | null;
  verified: boolean;
  verifiedType: string | null;
  isConnected: boolean;
  trackedAccountId: string | null;
}

export interface LeaderboardWindowTotals {
  provider: string;
  providerAccountId: string;
  posts: number;
  interactions: number;
  impressions: number;
  previousPosts: number;
  previousInteractions: number;
  previousImpressions: number;
}

export interface LeaderboardEntry {
  key: string;
  provider: string;
  providerAccountId: string;
  username: string;
  displayName: string | null;
  profileImageUrl: string | null;
  verified: boolean;
  verifiedType: string | null;
  isConnected: boolean;
  trackedAccountId: string | null;
  rank: number;
  previousRank: number | null;
  rankChange: number | null;
  interactions: number;
  impressions: number | null;
  posts: number;
}

export interface LeaderboardResponse {
  configured: boolean;
  days: LeaderboardWindow;
  entries: LeaderboardEntry[];
}

export interface TopPostsCardProps {
  posts: TopPostItem[];
  action?: ReactNode;
  isPending?: boolean;
}

export interface LeaderboardCardProps {
  organizationId: string;
  organizationSlug: string;
  variant?: "module" | "page";
}

export interface AnalyticsPageClientProps {
  organizationSlug: string;
}

export type AnalyticsProviderFilter = "all" | "twitter" | "linkedin";

export type AnalyticsFlagState = "enabled" | "disabled" | "unavailable";

export interface AccountDetailViewProps {
  organizationSlug: string;
  handle: string;
  variant?: "modal" | "page";
}

export interface AccountModalProps {
  title: string;
  children: ReactNode;
}

export interface AccountEngagementPoint {
  day: string;
  engagement: number;
  [key: string]: string | number;
}

export interface AccountIdentity {
  provider: string;
  providerAccountId: string;
  username: string;
  displayName: string | null;
  profileImageUrl: string | null;
  verified: boolean;
  verifiedType: string | null;
  followersCount: number | null;
}

export interface LeaderboardDetailMetric {
  label: string;
  value: string;
}

export interface TrackAccountPreviewResponse {
  account: ResolvedTwitterAccount | null;
}

export interface AnalyticsHeroSummary {
  followers: number | null;
  impressions: number;
  interactions: number;
  posts: number;
  engagementRate: number | null;
}

export interface SummaryStatsProps {
  accounts: SocialOverviewAccount[];
  points: EngagementTimeseriesPoint[];
  rangeHint: string;
}

export interface AnalyticsStatTile {
  label: string;
  value: string;
  hint: string;
}

export interface AccountSeriesChartCardProps {
  hero?: boolean;
  title: string;
  description?: string;
  action?: ReactNode;
  markIncompleteTail: boolean;
  kind: "area" | "line" | "bar";
  rows: AccountSeriesRow[];
  config: ChartConfig;
  allKeys: string[];
  hiddenKeys: ReadonlySet<string>;
  onToggleSeries: (key: string) => void;
  markers: ChartMarker[];
  emptyMessage: string;
}

export interface ChartSeriesLegendProps {
  config: ChartConfig;
  orderedKeys: string[];
  hiddenKeys: ReadonlySet<string>;
  onToggle: (key: string) => void;
}

export interface FollowersCardProps {
  accounts: SocialOverviewAccount[];
  points: FollowerGrowthPoint[];
  hiddenKeys: ReadonlySet<string>;
  colorForKey: (key: string) => ChartColorPair;
  action?: ReactNode;
  markIncompleteTail: boolean;
}

export interface PostingHeatmapCell {
  weekday: number;
  hour: number;
  posts: number;
  avgEngagement: number;
  level: PostingActivityLevel;
}

export interface PostingPerformanceCardProps {
  points: PostingPerformancePoint[];
  action?: ReactNode;
}

export interface CursorTipState {
  x: number;
  y: number;
  flip: boolean;
  title: string;
  detail: string;
}

export interface CursorTooltipProps {
  tip: CursorTipState | null;
}

export interface ImpressionsShareCardProps {
  organizationId: string;
  colorForKey: (key: string) => ChartColorPair;
}

export interface ImpressionsShareRow {
  account: string;
  impressions: number;
  seriesKey: string;
  [key: string]: string | number;
}

export interface ImpressionsSharePieSlice extends ImpressionsShareRow {
  slice: string;
}

export interface ConnectAccountsButtonsProps {
  organizationId: string;
}

export interface ProviderIconProps {
  provider: string;
  className?: string;
}
