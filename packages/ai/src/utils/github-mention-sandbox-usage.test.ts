import { describe, expect, mock, test } from "bun:test";

import type { AgentTokenUsage } from "@notra/ai/types/agents";
import type { SandboxUsageUnknown } from "@notra/ai/types/github-mention-sandbox-usage";
import type { BoxRunData, Chunk, RunCost } from "@upstash/box";
import { Schedule } from "effect";

import { consumeGitHubMentionSandboxStream } from "./github-mention-sandbox-usage";

const cost: RunCost = {
  inputTokens: 12,
  outputTokens: 3,
  cachedInputTokens: 2,
  totalUsd: 0.04,
  computeMs: 90,
};

function persistedRun(
  overrides: Partial<
    Pick<
      BoxRunData,
      | "input_tokens"
      | "output_tokens"
      | "cached_input_tokens"
      | "cost_usd"
      | "duration_ms"
      | "completed_at"
    >
  > & { status?: "running" | "completed" | "failed" | "cancelled" } = {}
): BoxRunData {
  return {
    id: "run-1",
    box_id: "box-1",
    customer_id: "customer-1",
    type: "agent",
    input_tokens: 12,
    output_tokens: 3,
    cached_input_tokens: 2,
    cost_usd: 0.04,
    duration_ms: 90,
    created_at: 1,
    completed_at: 2,
    status: "completed",
    ...overrides,
  };
}

function stream(chunks: Chunk[], error?: Error) {
  const cancel = mock(async () => undefined);
  return {
    cost,
    cancel,
    async *[Symbol.asyncIterator]() {
      yield* chunks;
      if (error) {
        throw error;
      }
    },
  };
}

function setup(chunks: Chunk[], runs: BoxRunData[][], error?: Error) {
  const usage = mock((_usage: AgentTokenUsage) => undefined);
  const unknown = mock((_details: SandboxUsageUnknown) => undefined);
  let calls = 0;
  const listRuns = mock(
    async () => runs[Math.min(calls++, runs.length - 1)] ?? []
  );
  const value = stream(chunks, error);
  const consume = () =>
    consumeGitHubMentionSandboxStream({
      box: { id: "box-1", listRuns },
      stream: value,
      callbacks: { onUsage: usage, onUsageUnknown: unknown },
      recoverySchedule: Schedule.recurs(2),
    });
  return { consume, listRuns, stream: value, unknown, usage };
}

describe("consumeGitHubMentionSandboxStream", () => {
  test("uses stream cost after an explicit finish", async () => {
    const subject = setup(
      [
        { type: "start", runId: "run-1" },
        {
          type: "finish",
          output: "done",
          usage: { inputTokens: 12, outputTokens: 3, cachedInputTokens: 2 },
          sessionId: "session-1",
        },
      ],
      [[]]
    );

    await subject.consume();

    expect(subject.usage).toHaveBeenCalledTimes(1);
    expect(subject.usage.mock.calls[0]?.[0]).toMatchObject({
      inputTokens: 10,
      outputTokens: 3,
      cacheReadTokens: 2,
      totalUsd: 0.04,
    });
    expect(subject.listRuns).not.toHaveBeenCalled();
  });

  test("recovers usage after a partial stream failure and rethrows", async () => {
    const failure = new Error("connection lost");
    const subject = setup(
      [
        { type: "start", runId: "run-1" },
        { type: "text-delta", text: "x" },
      ],
      [[], [persistedRun()]],
      failure
    );

    await expect(subject.consume()).rejects.toBe(failure);
    expect(subject.stream.cancel).toHaveBeenCalledTimes(1);
    expect(subject.usage).toHaveBeenCalledTimes(1);
    expect(subject.listRuns).toHaveBeenCalledTimes(2);
  });

  test("recovers usage after clean EOF without finish", async () => {
    const subject = setup(
      [{ type: "start", runId: "run-1" }],
      [
        [persistedRun({ status: "running", completed_at: undefined })],
        [persistedRun()],
      ]
    );

    await subject.consume();

    expect(subject.usage).toHaveBeenCalledTimes(1);
    expect(subject.stream.cancel).not.toHaveBeenCalled();
  });

  test("accepts authoritative terminal zero usage", async () => {
    const subject = setup(
      [{ type: "start", runId: "run-1" }],
      [
        [
          persistedRun({
            input_tokens: 0,
            output_tokens: 0,
            cached_input_tokens: 0,
            cost_usd: 0,
            duration_ms: 0,
            status: "cancelled",
          }),
        ],
      ]
    );

    await expect(subject.consume()).rejects.toThrow("cancelled");

    expect(subject.usage.mock.calls[0]?.[0]).toMatchObject({
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      totalUsd: 0,
      computeMs: 0,
    });
  });

  test("reports unknown usage when recovery is exhausted", async () => {
    const subject = setup([{ type: "start", runId: "run-1" }], [[], [], []]);

    await expect(subject.consume()).rejects.toThrow(
      "Sandbox usage is unknown (boxId=box-1, runId=run-1)"
    );
    expect(subject.listRuns).toHaveBeenCalledTimes(3);
    expect(subject.usage).not.toHaveBeenCalled();
    expect(subject.unknown).toHaveBeenCalledWith({
      boxId: "box-1",
      runId: "run-1",
      reason: "Sandbox run run-1 is not persisted yet",
    });
  });
});
