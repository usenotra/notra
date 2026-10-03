export type ContenderKind = "llm" | "jev";

/** One model (plus how to call it) that competes in a suite. */
export interface Contender {
  /** Stable key, unique within a run. Usually the model id. */
  readonly key: string;
  readonly modelId: string;
  readonly kind: ContenderKind;
  readonly label: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
}

export interface CallResult<OUTPUT> {
  output: OUTPUT;
  usage: TokenUsage;
  /** USD reported by the gateway, if any. */
  costUsd?: number;
  /** Raw text worth showing in the case drill-down (prompt answer, post). */
  transcript?: string;
}

export interface CallContext {
  readonly contender: Contender;
  readonly abortSignal: AbortSignal;
  readonly demo: boolean;
}

/** Score of a single field (classification) or check (generation), 0..1. */
export interface FieldScore {
  readonly field: string;
  readonly score: number;
  readonly expected?: string;
  readonly actual?: string;
  readonly note?: string;
}

export interface CaseScore {
  /** Mean of field scores, 0..1. */
  readonly score: number;
  readonly pass: boolean;
  readonly fields: readonly FieldScore[];
  /** Spend of an LLM/Jev judge used while scoring, not billed to the contender. */
  readonly judgeCostUsd?: number;
}

export interface DemoContext {
  readonly contender: Contender;
  /** Probability that this model gets a field right. */
  readonly skill: number;
  readonly rng: () => number;
  /** True with probability `skill`. */
  hit(): boolean;
  /** Returns `correct` with probability `skill`, otherwise a different option. */
  pick<T>(correct: T, options: readonly T[]): T;
}

export interface EvalCase<INPUT, EXPECTED> {
  readonly id: string;
  readonly input: INPUT;
  readonly expected: EXPECTED;
  /** Short line shown in tables. */
  readonly title: string;
  readonly tags?: readonly string[];
}

export type SuiteKind = "classification" | "generation";

export interface ScoreContext {
  readonly abortSignal: AbortSignal;
  readonly demo: boolean;
}

export interface EvalSuite<
  INPUT = unknown,
  EXPECTED = unknown,
  OUTPUT = unknown,
> {
  readonly id: string;
  readonly name: string;
  readonly kind: SuiteKind;
  /** Which part of the content harness this mirrors (file reference). */
  readonly stage: string;
  readonly description: string;
  readonly cases: readonly EvalCase<INPUT, EXPECTED>[];
  readonly defaultContenders: readonly string[];
  /** Model prod uses for this stage today (the picker's baseline). */
  readonly productionModel: string;
  /** Field names whose confusion matrix the results view can show. */
  readonly labelFields?: readonly string[];
  /** Per-call timeout. */
  readonly timeoutMs: number;
  run(input: INPUT, ctx: CallContext): Promise<CallResult<OUTPUT>>;
  score(
    output: OUTPUT,
    testCase: EvalCase<INPUT, EXPECTED>,
    ctx: ScoreContext
  ): Promise<CaseScore> | CaseScore;
  /** Produces a plausible output for the demo mode without calling a model. */
  demoOutput(testCase: EvalCase<INPUT, EXPECTED>, demo: DemoContext): OUTPUT;
  /** Human-readable rendering of an output (demo runs and the case view). */
  transcript?(output: OUTPUT): string;
}

export type AnySuite = EvalSuite<any, any, any>;

export type TaskStatus = "queued" | "running" | "done" | "error";

export interface TaskResult {
  readonly contenderKey: string;
  readonly caseId: string;
  readonly repeat: number;
  status: TaskStatus;
  startedAt?: number;
  durationMs?: number;
  score?: CaseScore;
  usage?: TokenUsage;
  costUsd?: number;
  output?: unknown;
  transcript?: string;
  error?: string;
}

export interface RunConfig {
  readonly suiteId: string;
  readonly contenders: readonly Contender[];
  readonly repeats: number;
  readonly concurrency: number;
  readonly demo: boolean;
  /** Restrict to these case ids (empty = all). */
  readonly caseIds?: readonly string[];
}

export type RunStatus = "running" | "done" | "cancelled" | "failed";

export interface EvalRun {
  readonly id: string;
  readonly config: RunConfig;
  readonly suiteName: string;
  readonly suiteKind: SuiteKind;
  readonly createdAt: string;
  finishedAt?: string;
  status: RunStatus;
  tasks: TaskResult[];
}

export interface ContenderSummary {
  readonly contenderKey: string;
  readonly label: string;
  readonly total: number;
  readonly done: number;
  readonly errors: number;
  readonly running: number;
  /** Mean score of finished tasks, 0..1. */
  readonly accuracy: number;
  readonly passRate: number;
  readonly p50Ms: number;
  readonly p95Ms: number;
  readonly costUsd: number;
  readonly judgeCostUsd: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly fieldAccuracy: Readonly<Record<string, number>>;
  readonly latencies: readonly number[];
}
