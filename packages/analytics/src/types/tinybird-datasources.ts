import type { InferRow } from "@tinybirdco/sdk";

import type { webPageEngagement, webPageViews } from "../tinybird/datasources";

export type WebPageViewRow = InferRow<typeof webPageViews>;

export type WebPageEngagementRow = InferRow<typeof webPageEngagement>;
