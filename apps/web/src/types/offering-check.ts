import type { IconSvgElement } from "@hugeicons/react";
import type { ComponentProps, ReactNode } from "react";

export type OfferingVerdict = "knows" | "vague" | "confused" | "unknown";

export interface OfferingCheckInput {
  domain: string;
  feature: string;
  description: string;
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
  verdict: OfferingVerdict;
  summary: string;
  answer: string;
  reasoning: string;
  seconds: number;
  otherOfferings: string[];
  queries: string[];
  searchUsed: boolean;
  sources: OfferingSourceDomain[];
  checkedAt: string;
}

export type OfferingStreamEvent =
  | { type: "delta"; text: string }
  | { type: "reasoning"; text: string }
  | { type: "search"; queries: string[]; domains: string[] }
  | { type: "answered"; seconds: number }
  | { type: "result"; result: OfferingCheckResult }
  | { type: "error" };

export type OfferingStreamEmit = (event: OfferingStreamEvent) => void;

export interface OfferingVerdictCopy {
  label: string;
  badgeClassName: string;
  textClassName: string;
  /** Hero title before the subject, e.g. "AI finds ". */
  heroLead: string;
  featureBody: string;
  companyBody: string;
}

export type OfferingCheckSample = OfferingCheckInput;

export type OfferingFailureStatus = "rate-limited" | "unavailable" | "error";

type OfferingReportStatus = "checking" | "done" | OfferingFailureStatus;

export type OfferingFormProblem = "invalid" | OfferingFailureStatus;

export interface OfferingCheckFormProps {
  samples: readonly OfferingCheckSample[];
}

export interface OfferingReportProps {
  input: OfferingCheckInput;
}

export interface OfferingLiveState {
  status: OfferingReportStatus;
  answer: string;
  reasoning: string;
  seconds: number | null;
  queries: string[];
  domains: string[];
  result: OfferingCheckResult | null;
}

export interface OfferingChatWindowProps {
  feature: string;
  question: string;
  state: OfferingLiveState;
}

export interface OfferingChatReasoningProps {
  state: OfferingLiveState;
}

export interface OfferingMarkdownNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: OfferingMarkdownNode[];
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

export interface OfferingVerdictRowProps {
  verdict: OfferingVerdict | null;
  summary: string | null;
  activity: string | null;
}

export interface OfferingReportCardProps {
  input: OfferingCheckInput;
  state: OfferingLiveState;
}

export interface OfferingReportStatProps {
  label: string;
  value: ReactNode;
  pending?: boolean;
}

export interface OfferingSourceSiteProps {
  source: OfferingSourceDomain;
}

export interface OfferingSourcesProps {
  sources: readonly OfferingSourceDomain[];
}

export interface OfferingFaviconProps {
  domain: string;
  className?: string;
}

export interface OfferingSentenceFieldProps extends ComponentProps<"input"> {
  id: string;
  label: string;
  invalid: boolean;
  leading?: ReactNode;
}

export interface OfferingDomainFaviconProps {
  value: string;
}
