import type { LanguageModelV4CallOptions } from "@ai-sdk/provider";
import type {
  DecideGatewayInput,
  GatewayAdapter,
  GatewayDecision,
  GatewayId,
  ModelRouterConfig,
  Plan,
  RouterLogFields,
  RouterPolicyConfig,
} from "@notra/ai/types/router";

export interface RecordedRouterCall {
  gateway: GatewayId;
  modelId: string;
  options: LanguageModelV4CallOptions;
}

export interface FakeAdapterOptions {
  id: GatewayId;
  enforcesZdr?: boolean;
  supportedModels?: (modelId: string) => boolean;
  balance?: number | null;
  onCall?: (call: RecordedRouterCall) => void;
  upstreamProvider?: string;
}

export interface FakeAdapter extends GatewayAdapter {
  calls: RecordedRouterCall[];
  createdModels: string[];
  balanceCalls: number;
}

export interface RouterTestLogEntry {
  level: "info" | "warn" | "error";
  event: string;
  fields?: RouterLogFields;
}

export interface TestRouterOptions {
  vercel?: FakeAdapter | null;
  openrouter?: FakeAdapter | null;
  plans?: Record<string, Plan>;
  resolvePlan?: ModelRouterConfig["resolvePlan"];
  resolveZdr?: ModelRouterConfig["resolveZdr"];
  policy?: Partial<RouterPolicyConfig>;
  now?: () => number;
  planCacheTtlMs?: number;
  creditCheckTtlMs?: number;
}

export interface PolicyTestCase {
  name: string;
  input: Omit<DecideGatewayInput, "policy">;
  expected: GatewayDecision;
}
