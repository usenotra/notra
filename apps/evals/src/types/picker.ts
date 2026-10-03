import type { AnySuite } from "./eval";

/** What the latest saved run says about one model on one suite. */
export interface MeasuredModel {
  readonly modelId: string;
  readonly label: string;
  /** Latest run that contains this model; older runs are ignored. */
  readonly runId: string;
  readonly runAt: string;
  readonly cases: number;
  readonly errors: number;
  readonly errorRate: number;
  /** Mean case score, 0..1. */
  readonly score: number;
  /** Standard error of the mean score. */
  readonly scoreSe: number;
  readonly passRate: number;
  readonly p50Ms: number;
  /** Contender spend per attempted call (judge spend excluded). */
  readonly costPerCall: number;
}

/** A measured model judged against the suite's bar. */
export interface ModelEvidence extends MeasuredModel {
  readonly frontier: boolean;
  readonly eligible: boolean;
  /** Why it is not eligible, if it is not. */
  readonly blocker?: string;
}

/** An untested catalog model priced from the measured token usage. */
export interface Candidate {
  readonly modelId: string;
  readonly label: string;
  readonly estCostPerCall: number;
}

export interface SuitePick {
  readonly suite: AnySuite;
  readonly evidence: readonly ModelEvidence[];
  readonly production?: ModelEvidence;
  readonly recommended?: ModelEvidence;
  /** Best measured score, the bar the tolerance is applied to. */
  readonly bestScore: number;
  readonly candidates: readonly Candidate[];
  readonly volume: number;
  /** Suite whose call already contains this stage's spend. */
  readonly includedIn?: string;
  /** Fewer scored cases than MIN_CASES, so the pick needs a verify run. */
  readonly smallSample: boolean;
  readonly monthlyNow?: number;
  readonly monthlyRecommended?: number;
}

export interface PickerSettings {
  /** Allowed score drop below the best model, in percentage points. */
  tolerancePts: number;
  /** Calls per month per suite, used to turn $/call into $/month. */
  volumes: Record<string, number>;
}
