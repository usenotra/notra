import type { IconSvgElement } from "@hugeicons/react";
import type { ComponentProps, ReactNode } from "react";

export type OfferingVerdict = "knows" | "vague" | "confused" | "unknown";

/** "name" asks about the feature by name, "problem" describes the need without it. */
export type OfferingQuestionKind = "name" | "problem";

export interface OfferingCheckInput {
  domain: string;
  feature: string;
  /** What the feature solves, in the buyer's words. Empty when not given. */
  problem: string;
  /** Lets the model search the web. Off means training data only. */
  webSearch: boolean;
}

export interface OfferingQuestion {
  kind: OfferingQuestionKind;
  text: string;
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

interface OfferingGrade {
  verdict: OfferingVerdict;
  summary: string;
}

export interface OfferingAnswer extends OfferingGrade {
  kind: OfferingQuestionKind;
  question: string;
  answer: string;
  reasoning: string;
  seconds: number;
  queries: string[];
  searchUsed: boolean;
  sources: OfferingSourceDomain[];
}

export interface OfferingCheckResult {
  domain: string;
  feature: string;
  problem: string;
  companyName: string;
  companyDescription: string;
  model: string;
  otherOfferings: string[];
  /** The name question first, then the problem question when one was asked. */
  answers: OfferingAnswer[];
  checkedAt: string;
}

export type OfferingStreamEvent =
  | { type: "delta"; kind: OfferingQuestionKind; text: string }
  | { type: "reasoning"; kind: OfferingQuestionKind; text: string }
  | {
      type: "search";
      kind: OfferingQuestionKind;
      queries: string[];
      domains: string[];
    }
  | { type: "answered"; kind: OfferingQuestionKind; seconds: number }
  | { type: "result"; result: OfferingCheckResult }
  | { type: "error" };

export type OfferingStreamEmit = (event: OfferingStreamEvent) => void;

export interface OfferingVerdictCopy {
  label: string;
  /** Verdict label for the problem question, e.g. "Recommends it". */
  problemLabel: string;
  badgeClassName: string;
  textClassName: string;
  /** Hero title before the subject, e.g. "AI finds ". */
  heroLead: string;
  featureBody: string;
  companyBody: string;
  /** Hero title and body when the problem question was asked. */
  problemLead: string;
  problemBody: string;
}

export type OfferingCheckSample = OfferingSampleValues;

export type OfferingRateLimitScope = "visitor" | "site" | "busy";

export type OfferingFailureStatus =
  | "rate-limited"
  | "site-limited"
  | "busy"
  | "unknown-site"
  | "unavailable"
  | "error";

type OfferingReportStatus =
  | "checking"
  | "done"
  /** The server wants a Turnstile token before it runs an uncached scan. */
  | "verify"
  | OfferingFailureStatus;

export type OfferingFormProblem =
  | "invalid-domain"
  | "invalid-feature"
  | "invalid-problem"
  | OfferingFailureStatus;

export interface OfferingCheckFormProps {
  samples: readonly OfferingCheckSample[];
}

export interface OfferingReportProps {
  input: OfferingCheckInput;
}

/** One question while it streams in, then settled from its final answer. */
export interface OfferingThread {
  question: OfferingQuestion;
  answer: string;
  reasoning: string;
  seconds: number | null;
  queries: string[];
  domains: string[];
  /** Final answer with its grade, once the whole check is done. */
  result: OfferingAnswer | null;
}

export interface OfferingLiveState {
  status: OfferingReportStatus;
  threads: OfferingThread[];
  result: OfferingCheckResult | null;
}

export interface OfferingChatWindowProps {
  feature: string;
  hasFeature: boolean;
  thread: OfferingThread;
  webSearch: boolean;
}

export interface OfferingChatReasoningProps {
  thread: OfferingThread;
  webSearch: boolean;
}

export interface OfferingChatTraceProps {
  thread: OfferingThread;
  reasoning: string;
  answered: boolean;
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
  /** Best page per domain once the answer is graded; the site root until then. */
  links: Readonly<Record<string, string>>;
  /** Fade new items in while the answer streams. */
  live: boolean;
}

export interface OfferingTraceStepProps {
  icon: IconSvgElement;
  label: string;
  meta?: string;
  children: ReactNode;
}

export interface OfferingVerdictRowProps {
  kind: OfferingQuestionKind;
  label: string;
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
  /** Looks focused while an example types itself in. */
  active?: boolean;
  /** Keep at least the placeholder width, e.g. while the sentence has focus. */
  holdWidth: boolean;
  leading?: ReactNode;
}

export interface OfferingDomainFaviconProps {
  value: string;
}

export type OfferingSampleField = "domain" | "feature" | "problem";

export interface OfferingErrorTooltipProps {
  error: string | null;
  /** Bumped on every failed submit to replay the shake. */
  attempt: number;
  /** Sits inside a line of text, like the sentence fields. */
  inline?: boolean;
  children: ReactNode;
}

declare module "@tanstack/react-router" {
  interface HistoryState {
    /** Turnstile token the form hands to the report for its first scan. */
    offeringTurnstileToken?: string;
  }
}

/** An answer before the judge has graded it. */
export type OfferingAnsweredQuestion = Omit<
  OfferingAnswer,
  "verdict" | "summary"
>;

export type OfferingSampleValues = Pick<
  OfferingCheckInput,
  "domain" | "feature" | "problem"
>;

export interface OfferingTypingFrame {
  values: OfferingSampleValues;
  field: OfferingSampleField | null;
  /** Milliseconds after the start at which this frame shows. */
  at: number;
}

export type OfferingStreamAction =
  | { type: "event"; event: OfferingStreamEvent }
  | { type: "failed"; status: OfferingFailureStatus }
  | { type: "verify" }
  | { type: "restart" };

export interface OfferingRateLimitCheck {
  key: string;
  requests: number;
  windowMs: number;
  scope: OfferingRateLimitScope;
}

export interface OfferingHeroCopy {
  lead: string;
  body: string;
}

export interface OfferingNoticeDescription {
  field: OfferingSampleField | null;
  message: string;
}

export interface OfferingSourceSummary {
  sites: number;
  pages: number;
  ownSite: string;
}
