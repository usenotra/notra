import type { IconSvgElement } from "@hugeicons/react";
import type { ReactNode } from "react";

export type OfferingVerdict = "knows" | "vague" | "confused" | "unknown";

export type OfferingOverall =
  | "known"
  | "search-only"
  | "vague"
  | "confused"
  | "unknown";

export type OfferingCheckMode = "memory" | "search";

export interface OfferingCheckInput {
  domain: string;
  feature: string;
  description: string;
}

export interface OfferingModeResult {
  verdict: OfferingVerdict;
  summary: string;
  answer: string;
  reasoning: string;
  seconds: number;
}

interface OfferingSourcePage {
  url: string;
  cited: boolean;
}

export interface OfferingSourceDomain {
  domain: string;
  pages: number;
  urls: OfferingSourcePage[];
  cited: boolean;
  own: boolean;
  topUrl: string;
}

export interface OfferingCheckResult {
  domain: string;
  feature: string;
  companyName: string;
  companyDescription: string;
  model: string;
  overall: OfferingOverall;
  memory: OfferingModeResult;
  search: OfferingModeResult;
  otherOfferings: string[];
  queries: string[];
  searchUsed: boolean;
  sources: OfferingSourceDomain[];
  checkedAt: string;
}

export interface OfferingRawAnswer {
  answer: string;
  reasoning: string;
  seconds: number;
  queries: string[];
  retrievedUrls: string[];
  citedUrls: string[];
}

export type OfferingStreamEvent =
  | { type: "delta"; mode: OfferingCheckMode; text: string }
  | { type: "reasoning"; mode: OfferingCheckMode; text: string }
  | { type: "search"; queries: string[]; domains: string[] }
  | { type: "answered"; mode: OfferingCheckMode; seconds: number }
  | { type: "result"; result: OfferingCheckResult }
  | { type: "error" };

export type OfferingStreamEmit = (event: OfferingStreamEvent) => void;

export interface OfferingOverallCopy {
  lead: string;
  trail: string;
  body: string;
}

export interface OfferingVerdictCopy {
  label: string;
  className: string;
}

export type OfferingCheckSample = OfferingCheckInput;

export type OfferingReportStatus =
  | "checking"
  | "done"
  | "rate-limited"
  | "unavailable"
  | "error";

export interface OfferingCheckFormProps {
  samples: readonly OfferingCheckSample[];
}

export interface OfferingReportPageProps {
  searchParams: Promise<{
    domain?: string | string[];
    feature?: string | string[];
    description?: string | string[];
  }>;
}

export interface OfferingReportProps {
  input: OfferingCheckInput;
  initialResult: OfferingCheckResult | null;
}

export interface OfferingLiveState {
  status: OfferingReportStatus;
  answers: Record<OfferingCheckMode, string>;
  reasoning: Record<OfferingCheckMode, string>;
  seconds: Record<OfferingCheckMode, number | null>;
  queries: string[];
  domains: string[];
  result: OfferingCheckResult | null;
}

export type OfferingChatPhase =
  | "thinking"
  | "searching"
  | "writing"
  | "grading"
  | "done";

export interface OfferingChatWindowProps {
  mode: OfferingCheckMode;
  feature: string;
  question: string;
  state: OfferingLiveState;
}

export interface OfferingSearchActivityProps {
  queries: readonly string[];
  domains: readonly string[];
}

export interface OfferingTraceStepProps {
  icon: IconSvgElement;
  label: string;
  meta?: string;
  children: ReactNode;
}

export interface OfferingVerdictSummaryProps {
  result: OfferingCheckResult | null;
}

export interface OfferingSourceSiteProps {
  source: OfferingSourceDomain;
}

export interface OfferingSourcesProps {
  sources: readonly OfferingSourceDomain[];
}

export interface OfferingCompanyHeaderProps {
  domain: string;
  result: OfferingCheckResult | null;
}

export interface OfferingFaviconProps {
  domain: string;
  className?: string;
}
