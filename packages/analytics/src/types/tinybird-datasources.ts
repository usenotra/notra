import type { InferRow } from "@tinybirdco/sdk";

import type { webPageViews } from "../tinybird/datasources";

export type WebPageViewRow = InferRow<typeof webPageViews>;
