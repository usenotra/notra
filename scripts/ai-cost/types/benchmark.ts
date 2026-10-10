import type { RecordedRouterCall } from "../../../packages/ai/src/types/router-test";

export type ProviderCall = RecordedRouterCall["options"];
export type RecordedCall = Pick<RecordedRouterCall, "options">;

export interface EvaluationWireCall {
  questions: Record<string, unknown>;
  state: unknown;
}

export type RevisionResult = BenchmarkResult & {
  revision: string;
  dirty: boolean;
  diffSha256: string;
};

export interface BenchmarkResult {
  fixtureSha256: string;
  measurements: Record<string, unknown>;
  sourceSha256: string;
  runtime: {
    bun: string;
    ai: string;
    provider: string;
    lockfileSha256: string;
  };
}
