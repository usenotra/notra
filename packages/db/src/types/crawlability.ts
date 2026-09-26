export type CrawlabilityResult = "passed" | "blocked" | "review" | "unknown";

export interface CrawlabilityCheck {
  id: string;
  name: string;
  result: CrawlabilityResult;
  evidence: string;
  recommendation: string | null;
}

export interface CrawlabilityPage {
  url: string;
  finalUrl: string | null;
  status: number | null;
  checks: CrawlabilityCheck[];
}

export interface CrawlabilityReport {
  checkedAt: string;
  pageLimit: number;
  pages: CrawlabilityPage[];
  discovery: string[];
}
