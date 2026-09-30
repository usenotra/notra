import type { AgentTokenUsage } from "@notra/ai/types/agents";
import type { BoxRunData, Chunk, RunCost } from "@upstash/box";

export type SandboxStream = AsyncIterable<Chunk> & {
  readonly cost: RunCost;
  cancel(): Promise<void>;
};

export interface SandboxRunStore {
  readonly id: string;
  listRuns(): Promise<BoxRunData[]>;
}

export interface SandboxUsageUnknown {
  boxId: string;
  runId: string | null;
  reason: string;
}

export interface SandboxUsageCallbacks {
  onUsage: (usage: AgentTokenUsage) => void;
  onUsageUnknown: (details: SandboxUsageUnknown) => void;
}
