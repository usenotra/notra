import type { InferOutputRow, InferParams } from "@tinybirdco/sdk";

import type {
  geoJourneyDetail,
  geoJourneyPages,
  geoJourneySources,
  geoTrafficJourneys,
  geoTrafficLog,
  geoTrafficOverview,
  geoTrafficPages,
  geoTrafficTimeseries,
} from "../tinybird/pipes/geo-traffic";
import type {
  accountLeaderboard,
  engagementTimeseries,
  followerGrowth,
  notraAdoption,
  postingPerformance,
  postMetricsLookup,
  socialOverview,
  topPosts,
} from "../tinybird/pipes/social";
import type {
  webAiOutcomes,
  webEngagement,
  webAudience,
  webHosts,
  webOverview,
  webPages,
  webSources,
  webTimeseries,
} from "../tinybird/pipes/web";

export type AccountLeaderboardParams = InferParams<typeof accountLeaderboard>;
export type AccountLeaderboardRow = InferOutputRow<typeof accountLeaderboard>;
export type PostingPerformanceParams = InferParams<typeof postingPerformance>;
export type PostingPerformanceRow = InferOutputRow<typeof postingPerformance>;
export type SocialOverviewParams = InferParams<typeof socialOverview>;
export type SocialOverviewRow = InferOutputRow<typeof socialOverview>;
export type EngagementTimeseriesParams = InferParams<
  typeof engagementTimeseries
>;
export type EngagementTimeseriesRow = InferOutputRow<
  typeof engagementTimeseries
>;
export type TopPostsParams = InferParams<typeof topPosts>;
export type TopPostsRow = InferOutputRow<typeof topPosts>;
export type FollowerGrowthParams = InferParams<typeof followerGrowth>;
export type FollowerGrowthRow = InferOutputRow<typeof followerGrowth>;

export type NotraAdoptionRow = InferOutputRow<typeof notraAdoption>;
export type PostMetricsLookupRow = InferOutputRow<typeof postMetricsLookup>;
export type GeoTrafficOverviewRow = InferOutputRow<typeof geoTrafficOverview>;
export type GeoTrafficTimeseriesRow = InferOutputRow<
  typeof geoTrafficTimeseries
>;
export type GeoTrafficPagesRow = InferOutputRow<typeof geoTrafficPages>;
export type GeoTrafficLogRow = InferOutputRow<typeof geoTrafficLog>;
export type GeoTrafficLogParams = InferParams<typeof geoTrafficLog>;
export type GeoTrafficPagesParams = InferParams<typeof geoTrafficPages>;
export type GeoTrafficJourneysRow = InferOutputRow<typeof geoTrafficJourneys>;
export type GeoJourneySourcesRow = InferOutputRow<typeof geoJourneySources>;
export type GeoJourneyPagesRow = InferOutputRow<typeof geoJourneyPages>;
export type GeoJourneyDetailRow = InferOutputRow<typeof geoJourneyDetail>;

export type WebOverviewRow = InferOutputRow<typeof webOverview>;
export type WebTimeseriesRow = InferOutputRow<typeof webTimeseries>;
export type WebPagesRow = InferOutputRow<typeof webPages>;
export type WebSourcesRow = InferOutputRow<typeof webSources>;
export type WebAudienceRow = InferOutputRow<typeof webAudience>;
export type WebHostsRow = InferOutputRow<typeof webHosts>;
export type WebAiOutcomesRow = InferOutputRow<typeof webAiOutcomes>;
export type WebEngagementRow = InferOutputRow<typeof webEngagement>;
