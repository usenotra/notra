import type { AnySuite, CallResult, Contender, EvalCase } from "../types/eval";

/** Rough per-model behaviour so demo runs look like real comparisons. */
interface DemoProfile {
  /** Probability of returning the expected answer. */
  skill: number;
  medianMs: number;
  errorRate: number;
  usdPerCall: number;
}

const DEFAULT_PROFILE: DemoProfile = {
  skill: 0.8,
  medianMs: 1400,
  errorRate: 0.04,
  usdPerCall: 0.0008,
};

const PROFILES: Record<string, Partial<DemoProfile>> = {
  "typesafe-ai/jev": {
    skill: 0.93,
    medianMs: 300,
    errorRate: 0.01,
    usdPerCall: 0.00005,
  },
  "openai/gpt-6-luna": {
    skill: 0.87,
    medianMs: 1000,
    errorRate: 0.03,
    usdPerCall: 0.0002,
  },
  "openai/gpt-5.6-luna": {
    skill: 0.86,
    medianMs: 1300,
    errorRate: 0.06,
    usdPerCall: 0.0004,
  },
  "openai/gpt-5.4-nano": {
    skill: 0.7,
    medianMs: 1100,
    errorRate: 0.03,
    usdPerCall: 0.0002,
  },
  "openai/gpt-oss-120b": {
    skill: 0.82,
    medianMs: 1250,
    errorRate: 0.02,
    usdPerCall: 0.0003,
  },
  "anthropic/claude-sonnet-5": {
    skill: 0.92,
    medianMs: 2600,
    errorRate: 0.01,
    usdPerCall: 0.006,
  },
  "anthropic/claude-opus-5.5": {
    skill: 0.95,
    medianMs: 5200,
    errorRate: 0.01,
    usdPerCall: 0.03,
  },
  "anthropic/claude-haiku-4.5": {
    skill: 0.88,
    medianMs: 900,
    errorRate: 0.02,
    usdPerCall: 0.0015,
  },
  "google/gemini-3.5-flash-lite": {
    skill: 0.78,
    medianMs: 700,
    errorRate: 0.03,
    usdPerCall: 0.0001,
  },
  "openai/gpt-6-sol": {
    skill: 0.94,
    medianMs: 4200,
    errorRate: 0.02,
    usdPerCall: 0.02,
  },
};

const DEMO_ERRORS = [
  "GatewayRateLimitError: Rate limit exceeded for model, retry after 2s",
  "AI_NoObjectGeneratedError: No object generated: response did not match schema.",
  "GatewayInternalServerError: upstream provider returned 529 (overloaded)",
  "AI_APICallError: fetch failed (cause: ECONNRESET)",
];

export function profileFor(modelId: string): DemoProfile {
  return { ...DEFAULT_PROFILE, ...PROFILES[modelId] };
}

/** Mulberry32, seeded so the same case/model pair varies but stays stable-ish. */
export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function hash(text: string): number {
  let value = 2_166_136_261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16_777_619);
  }
  return value >>> 0;
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true }
    );
  });
}

export async function demoCall(
  suite: AnySuite,
  testCase: EvalCase<unknown, unknown>,
  contender: Contender,
  signal: AbortSignal
): Promise<CallResult<unknown>> {
  const profile = profileFor(contender.modelId);
  const rng = createRng(hash(`${contender.key}:${testCase.id}`) ^ Date.now());
  // Log-normal-ish latency: most calls near the median, a long tail.
  const latency =
    profile.medianMs * Math.exp((rng() + rng() + rng() - 1.5) * 0.9);
  await sleep(Math.min(latency, suite.timeoutMs + 500), signal);

  if (rng() < profile.errorRate) {
    throw new Error(DEMO_ERRORS[Math.floor(rng() * DEMO_ERRORS.length)]);
  }

  const skillRng = createRng(hash(`${contender.modelId}:${testCase.id}:skill`));
  // Mix a stable per-model component with noise so repeats mostly agree.
  const mixed = () => (rng() < 0.75 ? skillRng() : rng());
  const hit = () => mixed() < profile.skill;
  const output = suite.demoOutput(testCase, {
    contender,
    skill: profile.skill,
    rng,
    hit,
    pick: <T>(correct: T, options: readonly T[]): T => {
      if (hit()) {
        return correct;
      }
      const wrong = options.filter((option) => option !== correct);
      return wrong[Math.floor(rng() * wrong.length)] ?? correct;
    },
  });
  const inputTokens = 600 + Math.round(rng() * 1200);
  const outputTokens =
    suite.kind === "generation"
      ? 400 + Math.round(rng() * 600)
      : 20 + Math.round(rng() * 60);

  return {
    output,
    usage: { inputTokens, outputTokens, cachedInputTokens: 0 },
    costUsd: profile.usdPerCall * (0.7 + rng() * 0.6),
    costSource: "estimated",
    transcript:
      suite.transcript?.(output) ??
      (typeof output === "string" ? output : JSON.stringify(output, null, 2)),
  };
}
