export interface ContextDevErrorResponse {
  message?: unknown;
  error_code?: string;
}

export interface ContextDevMarkdownOptions {
  enabled?: boolean;
  includeLinks?: boolean;
  includeImages?: boolean;
  shortenBase64Images?: boolean;
  useMainContentOnly?: boolean;
  includeFrames?: boolean;
  maxAgeMs?: number;
  waitForMs?: number;
  timeoutMS?: number;
}

export interface ContextDevWebSearchInput {
  query: string;
  limit?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  freshness?: "last_24_hours" | "last_week" | "last_month" | "last_year";
  queryFanout?: boolean;
  timeoutMS?: number;
  scrapeOptions?: {
    formats?: (
      | "markdown"
      | "html"
      | "rawHtml"
      | "links"
      | "images"
      | "summary"
    )[];
    onlyMainContent?: boolean;
    maxAge?: number;
  };
}

export interface ContextDevFetchWebpageInput {
  url: string;
  includeLinks?: boolean;
  includeImages?: boolean;
  onlyMainContent?: boolean;
  maxAgeMs?: number;
  waitForMs?: number;
  timeoutMS?: number;
}

export interface ContextDevFetchWebpageResponse {
  success: true;
  url: string;
  markdown: string;
  metadata?: {
    title?: string;
    description?: string;
    finalUrl?: string;
    sourceUrl?: string;
  };
}

export interface ContextDevCrawlSitemapInput {
  domain: string;
  maxLinks?: number;
  timeoutMS?: number;
  urlRegex?: string;
}

export interface ContextDevCrawlSitemapResponse {
  success: true;
  domain: string;
  urls: string[];
  meta: {
    sitemapsDiscovered: number;
    sitemapsFetched: number;
    sitemapsSkipped: number;
    errors: number;
  };
}

export interface ContextDevBrandColor {
  hex?: string;
  name?: string;
}

export interface ContextDevBrandLogo {
  url?: string;
  mode?: string;
  group?: number;
  type?: string;
  colors?: ContextDevBrandColor[];
  resolution?: {
    width?: number;
    height?: number;
    aspect_ratio?: number;
  };
}

export interface ContextDevBrandRetrieveResponse {
  status: "ok";
  brand: {
    domain?: string;
    logos?: ContextDevBrandLogo[];
  };
  code?: number;
}

export interface ContextDevCompetitor {
  name: string;
  domain: string;
  url?: string;
  description?: string;
  confidence?: "high" | "medium";
  sourceUrls?: string[];
}

export interface ContextDevCompetitorsResponse {
  status: "ok";
  domain: string;
  target?: {
    companyName?: string;
    field?: string;
    fieldDescription?: string;
    websiteUrl?: string;
  };
  competitors: ContextDevCompetitor[];
}

export interface ContextDevBrandSearchResult {
  domain: string;
  name: string;
  logo: string;
}

export interface ContextDevBrandSearchResponse {
  results: ContextDevBrandSearchResult[];
}

export interface ContextDevParsePdfInput {
  url: string;
  ocr?: boolean;
  timeoutMS?: number;
}

export interface ContextDevParsePdfResponse {
  markdown?: string | null;
  text?: string | null;
  pages?: Array<{
    markdown?: string | null;
    text?: string | null;
  } | null> | null;
}

export interface ContextDevStyleguideResponse {
  status: "ok";
  domain?: string;
  styleguide: Record<string, unknown>;
  code?: number;
}

export interface ContextDevScreenshotInput {
  domain?: string;
  directUrl?: string;
  format?: "png" | "jpeg";
  fullScreenshot?: boolean;
  handleCookiePopup?: boolean;
  maxAgeMs?: number;
  scrollOffset?: number;
  timeoutMS?: number;
  viewport?: {
    width: number;
    height: number;
  };
  waitForMs?: number;
}

export interface ContextDevScreenshotResponse {
  status?: "ok";
  code?: number;
  domain?: string;
  height?: number;
  width?: number;
  url?: string;
  screenshotUrl?: string;
  imageUrl?: string;
  screenshot?:
    | string
    | {
        url?: string;
        width?: number;
        height?: number;
        format?: string;
      };
  screenshotType?: "viewport" | "fullPage";
}

export interface ContextDevSearchResult {
  url: string;
  title: string;
  description: string;
  relevance: "high" | "medium" | "low";
  markdown?: {
    markdown: string | null;
    code:
      | "SUCCESS"
      | "NOT_REQUESTED"
      | "TIMEOUT"
      | "WEBSITE_ACCESS_ERROR"
      | "ERROR";
  } | null;
}

export interface ContextDevSearchResponse {
  query: string;
  results: ContextDevSearchResult[];
}

export interface ContextDevWebSearchResponse {
  success: true;
  data: {
    web: ContextDevSearchResult[];
  };
  results: ContextDevSearchResult[];
  query: string;
}

export type ContextDevScrapingResult =
  | { success: true; content: string }
  | { success: false; error: string; fatal: boolean };
