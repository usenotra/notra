import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";
import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
    const [dedupeKey, usageKey, billingKey, billedKey] = keys;
    const [input, output, read, write, cost, ttl] = args;
    if (
      !dedupeKey ||
      !usageKey ||
      !billingKey ||
      !billedKey ||
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
    const settling = hashes.has(billingKey) || markers.has(billedKey);
    if (settling) {
      expirations.delete(usageKey);
    } else {
      expirations.set(usageKey, ttl);
    }
    if (evalFailure === "after") {
      evalFailure = undefined;
      throw new Error("Response lost after commit");
    }
    return settling ? 2 : 1;
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
  hgetall: mock(async (key: string) => {
    const usage = hashes.get(key);
    return usage ? { ...usage } : null;
  }),
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
      [stepKey, accumulator, billing, billed],
      [80_000, 10_000, 20_000, 0, 132_000, USAGE_KEY_TTL_SECONDS]
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

// Exercise the production Lua in a disposable Redis process. No TCP listener,
// provider credentials, REST requests or emulated script rollback are involved.
describe("production usage Lua on local Unix-socket Redis", () => {
  let directory: string;
  let socket: string;
  let server: ChildProcess | undefined;
  let beforeRename: (() => Promise<void>) | undefined;
  let afterRename: (() => Promise<void>) | undefined;
  let loseEvalResponse = false;

  function command(...args: string[]) {
    const result = spawnSync(
      "redis-cli",
      ["-s", socket, "--json", "-e", ...args],
      {
        encoding: "utf8",
        env: { PATH: process.env.PATH, HOME: directory },
        timeout: 5000,
      }
    );
    if (result.error || result.status !== 0) {
      throw new Error(result.stdout + result.stderr, { cause: result.error });
    }
    return JSON.parse(result.stdout);
  }

  function accumulate(
    args = ["80000", "10000", "20000", "0", "132000", "86400"],
    script = ACCUMULATE_USAGE_SCRIPT
  ) {
    return command(
      "EVAL",
      script,
      "4",
      stepKey,
      accumulator,
      billing,
      billed,
      ...args
    );
  }

  const localRedis = {
    async eval(script: string, keys: string[], args: number[]) {
      const result = command(
        "EVAL",
        script,
        String(keys.length),
        ...keys,
        ...args.map(String)
      );
      if (loseEvalResponse) {
        loseEvalResponse = false;
        throw new Error("Actual EVAL committed; response discarded");
      }
      return result;
    },
    async set(
      key: string,
      value: string,
      options: { ex: number; nx?: boolean }
    ) {
      return command(
        "SET",
        key,
        value,
        "EX",
        String(options.ex),
        ...(options.nx ? ["NX"] : [])
      );
    },
    async exists(key: string) {
      return command("EXISTS", key);
    },
    async hgetall(key: string) {
      const value = command("HGETALL", key);
      return Object.keys(value).length ? value : null;
    },
    async rename(key: string, destination: string) {
      await beforeRename?.();
      command("RENAME", key, destination);
      await afterRename?.();
      return "OK";
    },
    async persist(key: string) {
      return command("PERSIST", key);
    },
    async del(key: string) {
      return command("DEL", key);
    },
  };

  beforeAll(async () => {
    const executorTemp = join(tmpdir(), "opencode");
    directory = mkdtempSync(
      join(existsSync(executorTemp) ? executorTemp : tmpdir(), "eve-")
    );
    socket = join(directory, "r.sock");
    server = spawn(
      "redis-server",
      [
        "--port",
        "0",
        "--unixsocket",
        socket,
        "--unixsocketperm",
        "700",
        "--save",
        "",
        "--appendonly",
        "no",
        "--dir",
        directory,
      ],
      {
        env: { PATH: process.env.PATH, HOME: directory },
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
    await new Promise<void>((resolve, reject) => {
      server?.once("error", reject);
      server?.once("exit", (code) =>
        reject(new Error(`Test Redis exited: ${code}`))
      );
      server?.stdout?.on("data", (data) => {
        if (String(data).includes("Ready to accept connections")) {
          resolve();
        }
      });
    });
    expect(command("CONFIG", "GET", "port")).toEqual({ port: "0" });
  });

  afterAll(async () => {
    if (server && server.exitCode === null) {
      const stopped = new Promise<void>((resolve) =>
        server?.once("exit", () => resolve())
      );
      server.kill("SIGTERM");
      await stopped;
    }
    if (directory) {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    command("FLUSHALL");
    beforeRename = undefined;
    afterRename = undefined;
    loseEvalResponse = false;
    mock.module("@notra/ai/utils/redis", () => ({ redis: localRedis }));
  });

  test("a step between existence check and RENAME enters the frozen bill", async () => {
    await step();
    beforeRename = () => step(reportedUsage, 1);
    await settle();
    expect(track.mock.calls[0]?.[0].value).toBe(27);
    expect(track.mock.calls[0]?.[0].properties.input_tokens).toBe(160_000);
    expect(command("EXISTS", accumulator, billing)).toBe(0);
  });

  test("a step after RENAME is retained separately, never deleted with the bill", async () => {
    await step();
    afterRename = () => step({ ...reportedUsage, costUsd: 0.264 }, 1);
    await settle();
    expect(track.mock.calls[0]?.[0].value).toBe(14);
    expect(command("HGET", accumulator, "costMicroUsd")).toBe("264000");
    expect(command("TTL", accumulator)).toBe(-1);
    expect(command("EXISTS", billing)).toBe(0);
    await settle();
    expect(track).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledWith(
      "[agent] Usage billing reconciliation required",
      undefined,
      expect.objectContaining({
        billingKey: accumulator,
        automaticRetry: false,
      })
    );
  });

  test("steps arriving after successful cleanup keep their evidence without recharging", async () => {
    await step();
    await settle();
    await step(reportedUsage, 1);
    await step(reportedUsage, 2);
    expect(command("HGET", accumulator, "costMicroUsd")).toBe("264000");
    expect(command("TTL", accumulator)).toBe(-1);
    await settle("turn.failed");
    expect(track).toHaveBeenCalledTimes(1);
  });

  test("discarding an actual EVAL response does not duplicate usage on replay", async () => {
    loseEvalResponse = true;
    await step();
    await step();
    expect(command("HGET", accumulator, "costMicroUsd")).toBe("132000");
    expect(command("TTL", accumulator)).toBeGreaterThan(0);
    expect(command("TTL", stepKey)).toBeGreaterThan(0);
    await settle();
    expect(track.mock.calls[0]?.[0].value).toBe(14);
  });

  test("an ambiguous billing response retains frozen and racing usage independently", async () => {
    await step();
    afterRename = () => step(reportedUsage, 1);
    trackFailure = "after";
    await settle();
    expect(command("TTL", billing)).toBe(-1);
    expect(command("TTL", accumulator)).toBe(-1);
    expect(command("HGET", billing, "costMicroUsd")).toBe("132000");
    expect(command("HGET", accumulator, "costMicroUsd")).toBe("132000");
    command("DEL", billed);
    await settle();
    expect(track).toHaveBeenCalledTimes(1);
    expect(acceptedCharges).toBe(1);
  });

  test.each([stepKey, accumulator, billing, billed])(
    "wrong key type at %s causes no writes and remains replayable after repair",
    (key) => {
      command("LPUSH", key, "corrupt");
      const before = command("DUMP", key);
      expect(() => accumulate()).toThrow("wrong usage key type");
      expect(command("DUMP", key)).toBe(before);
      if (key !== stepKey) {
        expect(command("EXISTS", stepKey)).toBe(0);
      }
      command("DEL", key);
      expect(accumulate()).toBe(1);
      expect(accumulate()).toBe(0);
      expect(command("HGET", accumulator, "costMicroUsd")).toBe("132000");
    }
  );

  test.each([
    "not-a-number",
    "1.5",
    "01",
    "-1",
    "9223372036854775807",
    "9007199254740991",
  ])(
    "malformed/overflowing final field %s cannot partially increment earlier fields",
    (cost) => {
      command(
        "HSET",
        accumulator,
        "inputTokens",
        "11",
        "outputTokens",
        "22",
        "costMicroUsd",
        cost
      );
      command("EXPIRE", accumulator, "60");
      const before = command("DUMP", accumulator);
      expect(() => accumulate()).toThrow();
      expect(command("DUMP", accumulator)).toBe(before);
      expect(command("TTL", accumulator)).toBeGreaterThan(0);
      expect(command("TTL", accumulator)).toBeLessThanOrEqual(60);
      expect(command("EXISTS", stepKey)).toBe(0);
      command("HSET", accumulator, "costMicroUsd", "100");
      expect(accumulate()).toBe(1);
      expect(command("HGET", accumulator, "inputTokens")).toBe("80011");
      expect(command("HGET", accumulator, "costMicroUsd")).toBe("132100");
    }
  );

  test.each([
    [4, "NaN"],
    [4, "1.5"],
    [4, "-1"],
    [4, "9007199254740992"],
    [5, "0"],
    [5, "-1"],
    [5, "1.5"],
    [5, "2147483648"],
  ] as const)(
    "invalid argument at index %s (%s) is rejected before writes",
    (index, value) => {
      command("HSET", accumulator, "inputTokens", "11", "costMicroUsd", "100");
      const before = command("DUMP", accumulator);
      const args = ["80000", "10000", "20000", "0", "132000", "86400"];
      args[index] = value;
      expect(() => accumulate(args)).toThrow();
      expect(command("DUMP", accumulator)).toBe(before);
      expect(command("EXISTS", stepKey)).toBe(0);
      expect(command("TTL", accumulator)).toBe(-1);
      expect(accumulate()).toBe(1);
      expect(command("HGET", accumulator, "costMicroUsd")).toBe("132100");
    }
  );

  test("missing args, aliased keys and unexpected pre-write Lua errors leave no marker", () => {
    command("HSET", accumulator, "inputTokens", "11");
    const before = command("DUMP", accumulator);
    expect(() =>
      accumulate(["80000", "10000", "20000", "0", "132000"])
    ).toThrow();
    expect(() =>
      command(
        "EVAL",
        ACCUMULATE_USAGE_SCRIPT,
        "4",
        stepKey,
        stepKey,
        billing,
        billed,
        "1",
        "1",
        "0",
        "0",
        "1",
        "60"
      )
    ).toThrow("usage keys must be distinct");
    const interrupted = ACCUMULATE_USAGE_SCRIPT.replace(
      "redis.call('HSET', KEYS[2], unpack(totals))",
      "error('unexpected pre-write failure')\nredis.call('HSET', KEYS[2], unpack(totals))"
    );
    expect(() => accumulate(undefined, interrupted)).toThrow(
      "unexpected pre-write failure"
    );
    expect(command("DUMP", accumulator)).toBe(before);
    expect(command("EXISTS", stepKey)).toBe(0);
    expect(accumulate()).toBe(1);
    expect(command("HGET", accumulator, "inputTokens")).toBe("80011");
  });
});
