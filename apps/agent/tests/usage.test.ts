import { beforeEach, describe, expect, mock, test } from "bun:test";

import { calculateTokenCostUsd } from "@notra/ai/billing/token-pricing";
import type { HookContext, HookEvent } from "eve/hooks";

import {
  ACCUMULATE_USAGE_SCRIPT,
  USAGE_KEY_TTL_SECONDS,
} from "../agent/lib/constants/usage";

const accumulator = "agent:usage:acc:session:turn";
const billing = `${accumulator}:billing`;
const billed = "agent:usage:billed:session:turn";
const stepKey = "agent:usage:step:session:turn:0";
const modelId = "openai/gpt-6-sol";
const hashes = new Map<string, Record<string, number>>();
const markers = new Map<string, string>();
const expirations = new Map<string, number>();
let evalFailure: "before" | "after" | undefined;
let commandFailure: "rename" | "persist" | "del" | undefined;
let trackFailure: "before" | "after" | undefined;
let acceptedCharges = 0;
let captureFails = false;
let flushFails = false;
let attributes: Record<string, string>;

const redis = {
  // Model a single server-side EVAL, including a lost response after commit.
  eval: mock(async (script: string, keys: string[], args: number[]) => {
    expect(script).toBe(ACCUMULATE_USAGE_SCRIPT);
    const [dedupeKey, usageKey] = keys;
    const [input, output, read, write, cost, ttl] = args;
    if (
      !dedupeKey ||
      !usageKey ||
      input === undefined ||
      output === undefined ||
      read === undefined ||
      write === undefined ||
      cost === undefined ||
      ttl === undefined
    ) {
      throw new Error("Invalid EVAL arguments");
    }
    if (evalFailure === "before") {
      evalFailure = undefined;
      throw new Error("Request not delivered");
    }
    if (markers.has(dedupeKey)) {
      return 0;
    }
    const increments = {
      inputTokens: input,
      outputTokens: output,
      cacheReadTokens: read,
      cacheWriteTokens: write,
      costMicroUsd: cost,
    };
    const usage = hashes.get(usageKey) ?? {};
    for (const [field, increment] of Object.entries(increments)) {
      usage[field] = (usage[field] ?? 0) + increment;
    }
    hashes.set(usageKey, usage);
    markers.set(dedupeKey, "1");
    expirations.set(dedupeKey, ttl);
    expirations.set(usageKey, ttl);
    if (evalFailure === "after") {
      evalFailure = undefined;
      throw new Error("Response lost after commit");
    }
    return 1;
  }),
  set: mock(async (key: string, value: string, options: { ex: number }) => {
    if (markers.has(key)) {
      return null;
    }
    markers.set(key, value);
    expirations.set(key, options.ex);
    return "OK";
  }),
  exists: mock(async (key: string) => Number(hashes.has(key))),
  hgetall: mock(async (key: string) => hashes.get(key) ?? null),
  rename: mock(async (key: string, destination: string) => {
    if (commandFailure === "rename") {
      commandFailure = undefined;
      throw new Error("Rename unavailable");
    }
    const usage = hashes.get(key);
    if (!usage) {
      throw new Error("No such key");
    }
    hashes.set(destination, usage);
    hashes.delete(key);
    const expiry = expirations.get(key);
    if (expiry !== undefined) {
      expirations.set(destination, expiry);
    }
    expirations.delete(key);
    return "OK";
  }),
  persist: mock(async (key: string) => {
    if (commandFailure === "persist") {
      commandFailure = undefined;
      throw new Error("Persist unavailable");
    }
    return Number(expirations.delete(key));
  }),
  del: mock(async (key: string) => {
    if (commandFailure === "del") {
      commandFailure = undefined;
      throw new Error("Delete unavailable");
    }
    hashes.delete(key);
    markers.delete(key);
    expirations.delete(key);
    return 1;
  }),
};
const track = mock(
  async (_input: {
    customerId: string;
    featureId: string;
    value: number;
    properties: Record<string, string | number>;
  }) => {
    if (trackFailure === "before") {
      throw new Error("Track rejected");
    }
    acceptedCharges += 1;
    if (trackFailure === "after") {
      throw new Error("Track response lost after acceptance");
    }
  }
);
const capture = mock(() => {
  if (captureFails) {
    throw new Error("Capture unavailable");
  }
});
const flush = mock(async () => {
  if (flushFails) {
    throw new Error("Flush unavailable");
  }
});
const logError = mock(
  (_message: string, _error?: unknown, _fields?: Record<string, unknown>) => {}
);

mock.module("@notra/ai/utils/redis", () => ({ redis }));
mock.module("@notra/ai/billing/autumn", () => ({
  autumn: { track },
  allowUnmeteredAiInDevelopment: false,
}));
mock.module("@notra/ai/utils/server-log", () => ({ logError }));
mock.module("@notra/posthog/server", () => ({
  captureServerEvent: capture,
  flushPostHogServer: flush,
}));

// Import the production hook and real billing/normalization helpers. Only
// network-bearing boundaries are mocked; no source extraction or copy runs.
const { createUsageHook } = await import("../agent/lib/hooks/usage");
const hook = createUsageHook(modelId);
const context = {
  session: {
    id: "session",
    auth: {
      get current() {
        return { attributes };
      },
      initiator: null,
    },
  },
  agent: { name: "content-writer" },
  channel: {},
} as unknown as HookContext;
const reportedUsage = {
  inputTokens: 100_000,
  outputTokens: 10_000,
  cacheReadTokens: 20_000,
  costUsd: 0.132,
};

async function step(
  usage: HookEvent<"step.completed">["data"]["usage"] = reportedUsage,
  stepIndex = 0,
  turnId = "turn"
) {
  await hook.events?.["step.completed"]?.(
    {
      type: "step.completed",
      data: {
        usage,
        stepIndex,
        turnId,
        sequence: 0,
        finishReason: "tool-calls",
      },
      meta: { id: `${turnId}:${stepIndex}`, at: "2026-10-10T00:00:00Z" },
    },
    context
  );
}

async function settle(
  type: "turn.completed" | "turn.failed" | "turn.cancelled" = "turn.completed",
  turnId = "turn"
) {
  const event = {
    data: {
      turnId,
      sequence: 0,
      code: "TEST_FAILURE",
      message: "Test failure",
    },
    meta: { id: `${turnId}:terminal`, at: "2026-10-10T00:00:00Z" },
  };
  if (type === "turn.failed") {
    await hook.events?.["turn.failed"]?.({ ...event, type }, context);
  } else if (type === "turn.cancelled") {
    await hook.events?.["turn.cancelled"]?.({ ...event, type }, context);
  } else {
    await hook.events?.["turn.completed"]?.({ ...event, type }, context);
  }
}

beforeEach(() => {
  hashes.clear();
  markers.clear();
  expirations.clear();
  for (const command of Object.values(redis)) {
    command.mockClear();
  }
  track.mockClear();
  capture.mockClear();
  flush.mockClear();
  logError.mockClear();
  evalFailure = undefined;
  commandFailure = undefined;
  trackFailure = undefined;
  acceptedCharges = 0;
  captureFails = false;
  flushFails = false;
  attributes = { organizationId: "organization", useMarkup: "false" };
  mock.module("@notra/ai/utils/redis", () => ({ redis }));
  mock.module("@notra/ai/billing/autumn", () => ({
    autumn: { track },
    allowUnmeteredAiInDevelopment: false,
  }));
});

describe("agent usage accumulation", () => {
  test("uses one EVAL for deduplication, all increments and both TTLs", async () => {
    await Promise.all([step(), step()]);
    expect(hashes.get(accumulator)).toEqual({
      inputTokens: 80_000,
      outputTokens: 10_000,
      cacheReadTokens: 20_000,
      cacheWriteTokens: 0,
      costMicroUsd: 132_000,
    });
    expect(expirations.get(stepKey)).toBe(USAGE_KEY_TTL_SECONDS);
    expect(expirations.get(accumulator)).toBe(USAGE_KEY_TTL_SECONDS);
    expect(redis.eval).toHaveBeenCalledWith(
      ACCUMULATE_USAGE_SCRIPT,
      [stepKey, accumulator],
      [80_000, 10_000, 20_000, 0, 132_000, USAGE_KEY_TTL_SECONDS]
    );
    expect(ACCUMULATE_USAGE_SCRIPT).toContain(
      "redis.call('SET', KEYS[1], '1', 'NX', 'EX', ARGV[6])"
    );
    for (const [index, field] of [
      "inputTokens",
      "outputTokens",
      "cacheReadTokens",
      "cacheWriteTokens",
      "costMicroUsd",
    ].entries()) {
      expect(ACCUMULATE_USAGE_SCRIPT).toContain(
        `redis.call('HINCRBY', KEYS[2], '${field}', ARGV[${index + 1}])`
      );
    }
    expect(ACCUMULATE_USAGE_SCRIPT).toContain(
      "redis.call('EXPIRE', KEYS[2], ARGV[6])"
    );
  });

  test("a failed request before EVAL leaves no partial usage or marker", async () => {
    evalFailure = "before";
    await step();
    expect(hashes.size).toBe(0);
    expect(markers.size).toBe(0);
    await step();
    expect(hashes.get(accumulator)?.costMicroUsd).toBe(132_000);
  });

  test("a response lost after EVAL is deduplicated on replay", async () => {
    evalFailure = "after";
    await step();
    await step();
    expect(hashes.get(accumulator)?.outputTokens).toBe(10_000);
    expect(hashes.get(accumulator)?.costMicroUsd).toBe(132_000);
    await settle();
    expect(track).toHaveBeenCalledTimes(1);
    expect(track.mock.calls[0]?.[0].value).toBe(14);
  });

  test("reported $0.132 overrides the $0.264 estimate (accounting, not savings)", async () => {
    expect(
      calculateTokenCostUsd(
        {
          inputTokens: 80_000,
          outputTokens: 10_000,
          cacheReadTokens: 20_000,
          cacheWriteTokens: 0,
          totalTokens: 110_000,
        },
        modelId
      )
    ).toBeCloseTo(0.264);
    await step();
    await step({ ...reportedUsage, costUsd: 0.264 }, 1);
    expect(hashes.get(accumulator)?.costMicroUsd).toBe(396_000);
    await settle();
    expect(track.mock.calls[0]?.[0].value).toBe(40);
  });

  test("reported zero stays zero, preserving the existing one-cent minimum", async () => {
    await step({ ...reportedUsage, costUsd: 0 });
    expect(hashes.get(accumulator)?.costMicroUsd).toBe(0);
    await settle();
    expect(track.mock.calls[0]?.[0].value).toBe(1);
  });

  for (const costUsd of [undefined, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    test(`invalid/missing cost ${costUsd} falls back to the existing estimator`, async () => {
      await step({ ...reportedUsage, costUsd });
      expect(hashes.get(accumulator)?.costMicroUsd).toBe(264_000);
      await settle();
      expect(track.mock.calls[0]?.[0].value).toBe(27);
    });
  }

  test("prices missing costs per call, not the turn's aggregate prompt", async () => {
    await step({ inputTokens: 200_000, outputTokens: 10_000 });
    await step({ inputTokens: 200_000, outputTokens: 10_000 }, 1);
    expect(hashes.get(accumulator)?.costMicroUsd).toBe(1_000_000);
    await settle();
    expect(track.mock.calls[0]?.[0].value).toBe(100);
  });

  test("applies markup once after summing step costs", async () => {
    attributes.useMarkup = "true";
    await step();
    await step(reportedUsage, 1);
    await settle();
    expect(track.mock.calls[0]?.[0].value).toBe(30);
  });

  test("honors reported costs without Redis too", async () => {
    mock.module("@notra/ai/utils/redis", () => ({ redis: null }));
    await step();
    expect(track.mock.calls[0]?.[0].value).toBe(14);
    await step({ ...reportedUsage, costUsd: 0 }, 1);
    expect(track.mock.calls[1]?.[0].value).toBe(1);
    expect(redis.eval).not.toHaveBeenCalled();
  });

  test("can meter reported positive cost without token counts", async () => {
    await step({ costUsd: 0.132 });
    await settle();
    expect(track.mock.calls[0]?.[0].value).toBe(14);
  });
});

describe("agent usage settlement", () => {
  for (const type of [
    "turn.completed",
    "turn.failed",
    "turn.cancelled",
  ] as const) {
    test(`${type} settles completed steps once`, async () => {
      await step();
      await Promise.all([settle(type), settle(type)]);
      await settle();
      expect(track).toHaveBeenCalledTimes(1);
      expect(markers.has(billed)).toBe(true);
      expect(hashes.has(billing)).toBe(false);
      expect(hashes.has(accumulator)).toBe(false);
    });
  }

  test("zero-step failure makes no charge and leaves no poisoned claim", async () => {
    await settle("turn.failed");
    expect(track).not.toHaveBeenCalled();
    expect(markers.has(billed)).toBe(false);
  });

  test("cancellation and a subsequent turn have independent usage", async () => {
    await step();
    await settle("turn.cancelled");
    await step({ ...reportedUsage, costUsd: 0.264 }, 0, "next-turn");
    await settle("turn.completed", "next-turn");
    expect(track.mock.calls.map(([input]) => input.value)).toEqual([14, 27]);
  });

  test.each(["capture", "flush"] as const)(
    "PostHog %s failure cannot reopen a successful charge",
    async (failure) => {
      captureFails = failure === "capture";
      flushFails = failure === "flush";
      await step();
      await settle();
      await settle("turn.failed");
      expect(acceptedCharges).toBe(1);
      expect(track).toHaveBeenCalledTimes(1);
      expect(markers.has(billed)).toBe(true);
      expect(hashes.has(billing)).toBe(false);
      expect(logError.mock.calls[0]?.[0]).toBe(
        "[agent] Charged usage telemetry failed"
      );
    }
  );

  test("transient rename failure releases only the pre-track claim", async () => {
    commandFailure = "rename";
    await step();
    await settle();
    expect(track).not.toHaveBeenCalled();
    expect(markers.has(billed)).toBe(false);
    expect(hashes.has(accumulator)).toBe(true);
    await settle();
    expect(track).toHaveBeenCalledTimes(1);
  });

  test.each(["before", "after"] as const)(
    "track rejection %s acceptance retains evidence without replay",
    async (failure) => {
      trackFailure = failure;
      await step();
      await settle();
      expect(hashes.get(billing)?.costMicroUsd).toBe(132_000);
      expect(expirations.has(billing)).toBe(false);
      expect(markers.has(billed)).toBe(true);
      await settle("turn.failed");
      // Model expiration of the claim: the persistent billing record still
      // blocks recharging. Recovery needs manual reconciliation, not retry.
      markers.delete(billed);
      await settle();
      expect(track).toHaveBeenCalledTimes(1);
      expect(acceptedCharges).toBe(failure === "after" ? 1 : 0);
      expect(logError).toHaveBeenCalledWith(
        "[agent] Usage billing reconciliation required",
        undefined,
        expect.objectContaining({ billingKey: billing, automaticRetry: false })
      );
    }
  );

  test("cleanup failure preserves the successful claim and pending evidence", async () => {
    commandFailure = "del";
    await step();
    await settle();
    await settle();
    expect(track).toHaveBeenCalledTimes(1);
    expect(markers.has(billed)).toBe(true);
    expect(hashes.has(billing)).toBe(true);
    expect(logError).toHaveBeenCalledWith(
      "[agent] Usage metering failed",
      expect.any(Error),
      expect.objectContaining({ billingKey: billing, charged: true })
    );
  });

  test("pre-track failure after rename cannot overwrite pending evidence", async () => {
    commandFailure = "persist";
    await step();
    await settle();
    expect(track).not.toHaveBeenCalled();
    expect(markers.has(billed)).toBe(false);
    expect(hashes.has(billing)).toBe(true);
    await settle();
    expect(track).not.toHaveBeenCalled();
    expect(hashes.get(billing)?.costMicroUsd).toBe(132_000);
    expect(expirations.has(billing)).toBe(false);
  });

  test("legacy accumulators without per-call cost still use the estimator", async () => {
    hashes.set(accumulator, {
      inputTokens: 80_000,
      outputTokens: 10_000,
      cacheReadTokens: 20_000,
      cacheWriteTokens: 0,
    });
    await settle();
    expect(track.mock.calls[0]?.[0].value).toBe(27);
  });

  test("the chargeAiCredits opt-out is preserved", async () => {
    attributes.chargeAiCredits = "false";
    await step();
    await settle("turn.failed");
    expect(redis.eval).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
  });

  test("development bypass is preserved", async () => {
    mock.module("@notra/ai/billing/autumn", () => ({
      autumn: { track },
      allowUnmeteredAiInDevelopment: true,
    }));
    await step();
    await settle("turn.cancelled");
    expect(redis.eval).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
  });
});
