import { beforeEach, describe, expect, mock, test } from "bun:test";

import {
  GEO_SCAN_BATCH_CONCURRENCY,
  GEO_SCAN_CLAIM_RENEW_AFTER_MS,
  GEO_SCAN_NO_RESULTS_RETRY_DELAY,
  GEO_SCAN_SEQUENCE_BATCH_SIZE,
  GEO_SCAN_TASK_BATCH_SIZE,
} from "@notra/geo-core/constants/geo";
import { EMPTY_AGENT_TOKEN_USAGE } from "@notra/geo-core/utils/token-usage";
import { FatalError } from "workflow";

import type { AppendAutomationLogInput } from "../src/types/workflows/content-generation-steps";
import type * as Steps from "../src/workflows/steps/geo-scan-steps";
import { scanPlan } from "./utils/geo-scan-plan";

const listProjects = mock<typeof Steps.listGeoScanProjectsStep>();
const prepare = mock<typeof Steps.prepareGeoScanProjectStep>();
const taskBatch = mock<typeof Steps.runGeoScanTaskBatchStep>();
const sequenceBatch = mock<typeof Steps.runGeoScanSequenceBatchStep>();
const personaBatch = mock<typeof Steps.runGeoScanPersonaBatchStep>();
const renewClaim = mock<typeof Steps.renewGeoScanClaimStep>();
const finalize = mock<typeof Steps.finalizeGeoScanProjectStep>();
const trackRetry = mock<typeof Steps.trackGeoScanRetryScheduledStep>();
const sleep = mock(async (_delay: string) => undefined);
const appendLog = mock(async (_input: AppendAutomationLogInput) => undefined);
const fetchRetention = mock(async () => 30 as const);
// These tests exercise orchestration decisions as ordinary functions. The
// durable runtime and model/billing steps have separate integration
// boundaries — the activity-log steps are mocked too, otherwise they would
// perform real Redis/billing network I/O during orchestration tests.
mock.module("workflow", () => ({ FatalError, sleep }));
mock.module("../src/workflows/steps/content-generation-steps", () => ({
  appendAutomationLog: appendLog,
  fetchLogRetention: fetchRetention,
  // Mirrors the production best-effort wrapper so orchestration tests can
  // exercise logging failures without real Redis access.
  appendAutomationLogBestEffort: async (input: AppendAutomationLogInput) => {
    try {
      await appendLog(input);
    } catch {
      // swallowed, like the production implementation
    }
  },
}));
mock.module("../src/workflows/steps/geo-scan-steps", () => ({
  listGeoScanProjectsStep: listProjects,
  prepareGeoScanProjectStep: prepare,
  runGeoScanTaskBatchStep: taskBatch,
  runGeoScanSequenceBatchStep: sequenceBatch,
  runGeoScanPersonaBatchStep: personaBatch,
  renewGeoScanClaimStep: renewClaim,
  finalizeGeoScanProjectStep: finalize,
  trackGeoScanRetryScheduledStep: trackRetry,
}));
const { geoScanWorkflow } = await import("../src/workflows/geo-scan");

function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function settle(condition: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 100 && !condition(); attempt += 1) {
    await tick();
  }
  expect(condition()).toBe(true);
}

beforeEach(() => {
  for (const fn of [
    listProjects,
    prepare,
    taskBatch,
    sequenceBatch,
    personaBatch,
    renewClaim,
    finalize,
    trackRetry,
    sleep,
    appendLog,
    fetchRetention,
  ]) {
    fn.mockReset();
  }
  appendLog.mockResolvedValue(undefined);
  fetchRetention.mockResolvedValue(30);
  renewClaim.mockImplementation(async (_projectId, claimedAt) => claimedAt);
  listProjects.mockResolvedValue(["project-test"]);
  prepare.mockImplementation(async (_org, projectId) => ({
    status: "planned",
    plan: scanPlan(projectId),
  }));
  taskBatch.mockImplementation(async (_context, batch) => ({
    checks: batch.length,
    mentions: 1,
    dropped: 0,
    usage: {
      ...EMPTY_AGENT_TOKEN_USAGE,
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
      totalUsd: 0.125,
    },
  }));
  sequenceBatch.mockImplementation(async (_context, batch) => ({
    checks: batch.length,
    mentions: 0,
    dropped: 0,
    usage: EMPTY_AGENT_TOKEN_USAGE,
  }));
  finalize.mockResolvedValue(undefined);
  personaBatch.mockImplementation(async (_context, batch) => ({
    checks: batch.length,
    mentions: 0,
    dropped: 0,
    usage: EMPTY_AGENT_TOKEN_USAGE,
  }));
  trackRetry.mockResolvedValue(undefined);
  sleep.mockResolvedValue(undefined);
});

describe("GEO scan workflow orchestration", () => {
  test("persona-only scans execute and contribute to finalization", async () => {
    const plan = scanPlan("project-test", 0, 0);
    plan.personas = [
      {
        personaId: "persona-test",
        engine: "test/engine",
        groundedKey: "test/engine",
        zdr: "none",
      },
    ];
    prepare.mockResolvedValue({ status: "planned", plan });

    await geoScanWorkflow({ organizationId: "org-test" });

    expect(personaBatch).toHaveBeenCalledWith(plan.context, plan.personas);
    expect(finalize).toHaveBeenCalledWith(
      plan.context,
      { checks: 1, mentions: 0, dropped: 0, usage: EMPTY_AGENT_TOKEN_USAGE },
      "completed",
      plan.claimedAt,
      { retried: false }
    );
    expect(sleep).not.toHaveBeenCalled();
  });

  test("invalid payloads do not reach project discovery", async () => {
    expect(await geoScanWorkflow({ organizationId: "" })).toEqual({
      status: "invalid_payload",
    });
    expect(listProjects).not.toHaveBeenCalled();
  });

  test("empty project discovery does not prepare, bill, or retry a scan", async () => {
    listProjects.mockResolvedValue([]);
    expect(await geoScanWorkflow({ organizationId: "org-test" })).toEqual({
      status: "skipped",
    });
    expect(prepare).not.toHaveBeenCalled();
    expect(taskBatch).not.toHaveBeenCalled();
    expect(sleep).not.toHaveBeenCalled();
  });

  test("a project whose preparation skips does not execute or finalize batches", async () => {
    prepare.mockResolvedValue({ status: "skipped", reason: "already_running" });
    expect(await geoScanWorkflow({ organizationId: "org-test" })).toEqual({
      status: "skipped",
    });
    expect(taskBatch).not.toHaveBeenCalled();
    expect(finalize).not.toHaveBeenCalled();
    expect(appendLog).not.toHaveBeenCalled();
    expect(sleep).not.toHaveBeenCalled();
  });

  test("runs projects sequentially so their batch windows cannot multiply provider traffic", async () => {
    listProjects.mockResolvedValue(["project-one", "project-two"]);
    let releaseFirstProject: (() => void) | undefined;
    taskBatch.mockImplementationOnce(
      (_context, batch) =>
        new Promise((resolve) => {
          releaseFirstProject = () =>
            resolve({
              checks: batch.length,
              mentions: 0,
              dropped: 0,
              usage: EMPTY_AGENT_TOKEN_USAGE,
            });
        })
    );
    const run = geoScanWorkflow({ organizationId: "org-test" });
    await settle(() => releaseFirstProject !== undefined);
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(prepare.mock.calls[0]?.[1]).toBe("project-one");
    releaseFirstProject?.();
    await settle(() => prepare.mock.calls.length === 2);
    expect(prepare.mock.calls[1]?.[1]).toBe("project-two");
    expect(await run).toMatchObject({ status: "completed" });
  });

  test("revalidates a handed claim before scanning projects listed ahead of it", async () => {
    listProjects.mockResolvedValue([
      "project-earlier",
      "project-handed",
      "project-later",
    ]);
    let releaseHandedProject: (() => void) | undefined;
    taskBatch.mockImplementationOnce(
      (_context, batch) =>
        new Promise((resolve) => {
          releaseHandedProject = () =>
            resolve({
              checks: batch.length,
              mentions: 0,
              dropped: 0,
              usage: EMPTY_AGENT_TOKEN_USAGE,
            });
        })
    );
    const run = geoScanWorkflow({
      organizationId: "org-test",
      projectId: "project-handed",
      claimedAt: "2026-09-01T00:00:00.000Z",
      scanId: "scan-handed",
    });

    await settle(() => releaseHandedProject !== undefined);
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(prepare.mock.calls[0]).toEqual([
      "org-test",
      "project-handed",
      {
        claimedAt: "2026-09-01T00:00:00.000Z",
        scanId: "scan-handed",
        retried: false,
        promptIds: undefined,
      },
    ]);

    releaseHandedProject?.();
    expect(await run).toMatchObject({ status: "completed" });
    expect(prepare.mock.calls.map(([, id]) => id)).toEqual([
      "project-handed",
      "project-earlier",
      "project-later",
    ]);
  });

  test("batches tasks and sequences, keeps the plan token, and sums results and usage", async () => {
    const plan = scanPlan(
      "project-test",
      GEO_SCAN_TASK_BATCH_SIZE + 1,
      GEO_SCAN_SEQUENCE_BATCH_SIZE + 1
    );
    prepare.mockResolvedValue({ status: "planned", plan });
    const payload = {
      organizationId: "org-test",
      projectId: "project-test",
      scanId: "pending-scan",
      claimedAt: plan.claimedAt,
      promptIds: ["prompt-0"],
      engines: ["openai/gpt-4.1"],
    };
    const result = await geoScanWorkflow(payload);
    expect(prepare).toHaveBeenCalledWith("org-test", "project-test", {
      scanId: "pending-scan",
      claimedAt: plan.claimedAt,
      promptIds: ["prompt-0"],
      engines: ["openai/gpt-4.1"],
      retried: false,
    });
    expect(taskBatch.mock.calls.map(([, batch]) => batch.length)).toEqual([
      GEO_SCAN_TASK_BATCH_SIZE,
      1,
    ]);
    expect(sequenceBatch.mock.calls.map(([, batch]) => batch.length)).toEqual([
      GEO_SCAN_SEQUENCE_BATCH_SIZE,
      1,
    ]);
    expect(result).toEqual({
      status: "completed",
      checks: plan.tasks.length + plan.sequences.length,
      mentions: 2,
    });
    expect(finalize).toHaveBeenCalledWith(
      plan.context,
      {
        checks: plan.tasks.length + plan.sequences.length,
        mentions: 2,
        dropped: 0,
        usage: {
          ...EMPTY_AGENT_TOKEN_USAGE,
          inputTokens: 20,
          outputTokens: 10,
          totalTokens: 30,
          totalUsd: 0.25,
        },
      },
      "completed",
      plan.claimedAt,
      { retried: false }
    );
    expect(appendLog).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-test",
        integrationId: "project-test",
        integrationType: "geo",
        title: "GEO scan completed for Notra",
        status: "success",
        referenceId: "run-test",
        retentionDays: 30,
        payload: expect.objectContaining({
          checks: plan.tasks.length + plan.sequences.length,
          mentions: 2,
          scanId: "scan-project-test",
        }),
      })
    );
    expect(sleep).not.toHaveBeenCalled();
  });

  test("keeps a window of batches in flight and refills a slot as soon as one settles", async () => {
    const plan = scanPlan(
      "project-test",
      GEO_SCAN_TASK_BATCH_SIZE * (GEO_SCAN_BATCH_CONCURRENCY + 2)
    );
    prepare.mockResolvedValue({ status: "planned", plan });
    let inFlight = 0;
    let peakInFlight = 0;
    const releases: (() => void)[] = [];
    taskBatch.mockImplementation((_context, batch) => {
      inFlight += 1;
      peakInFlight = Math.max(peakInFlight, inFlight);
      return new Promise((resolve) => {
        releases.push(() => {
          inFlight -= 1;
          resolve({
            checks: batch.length,
            mentions: 0,
            dropped: 0,
            usage: EMPTY_AGENT_TOKEN_USAGE,
          });
        });
      });
    });
    const run = geoScanWorkflow({ organizationId: "org-test" });
    await settle(() => releases.length === GEO_SCAN_BATCH_CONCURRENCY);
    expect(taskBatch).toHaveBeenCalledTimes(GEO_SCAN_BATCH_CONCURRENCY);
    // Releasing one batch refills exactly one slot without waiting for the rest.
    releases.shift()?.();
    await settle(
      () => taskBatch.mock.calls.length === GEO_SCAN_BATCH_CONCURRENCY + 1
    );
    expect(inFlight).toBe(GEO_SCAN_BATCH_CONCURRENCY);
    releases.shift()?.();
    await settle(
      () => taskBatch.mock.calls.length === GEO_SCAN_BATCH_CONCURRENCY + 2
    );
    while (releases.length > 0) {
      releases.shift()?.();
      await tick();
    }
    expect(await run).toEqual({
      status: "completed",
      checks: plan.tasks.length,
      mentions: 0,
    });
    expect(peakInFlight).toBe(GEO_SCAN_BATCH_CONCURRENCY);
  });

  test("stops starting batches after a failure but drains the ones in flight", async () => {
    const plan = scanPlan(
      "project-test",
      GEO_SCAN_TASK_BATCH_SIZE * (GEO_SCAN_BATCH_CONCURRENCY + 3)
    );
    prepare.mockResolvedValue({ status: "planned", plan });
    const releases: (() => void)[] = [];
    taskBatch.mockImplementation((_context, batch) => {
      const index = taskBatch.mock.calls.length - 1;
      return new Promise((resolve, reject) => {
        releases.push(() => {
          if (index === 2) {
            reject(new Error("Engine unavailable"));
            return;
          }
          resolve({
            checks: batch.length,
            mentions: 0,
            dropped: 0,
            usage: EMPTY_AGENT_TOKEN_USAGE,
          });
        });
      });
    });
    const run = geoScanWorkflow({ organizationId: "org-test" });
    await settle(() => releases.length === GEO_SCAN_BATCH_CONCURRENCY);
    // Two healthy batches settle first and each refills its slot.
    releases.shift()?.();
    releases.shift()?.();
    await settle(
      () => taskBatch.mock.calls.length === GEO_SCAN_BATCH_CONCURRENCY + 2
    );
    // The third batch fails: the window drains but no further batch starts.
    releases.shift()?.();
    await tick();
    while (releases.length > 0) {
      releases.shift()?.();
      await tick();
    }
    expect(await run).toEqual({
      status: "completed",
      checks: (GEO_SCAN_BATCH_CONCURRENCY + 1) * GEO_SCAN_TASK_BATCH_SIZE,
      mentions: 0,
    });
    expect(taskBatch).toHaveBeenCalledTimes(GEO_SCAN_BATCH_CONCURRENCY + 2);
    expect(finalize).toHaveBeenCalledWith(
      plan.context,
      expect.objectContaining({
        checks: (GEO_SCAN_BATCH_CONCURRENCY + 1) * GEO_SCAN_TASK_BATCH_SIZE,
      }),
      "failed",
      plan.claimedAt,
      { retried: false, failureReason: "Error" }
    );
    expect(appendLog).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-test",
        integrationId: "project-test",
        integrationType: "geo",
        title: "GEO scan failed for Notra",
        status: "failed",
        errorMessage: "Error",
      })
    );
  });

  test("renews the claim from the workflow once the token is old enough", async () => {
    const claimedAt = new Date(
      Date.now() - GEO_SCAN_CLAIM_RENEW_AFTER_MS - 1
    ).toISOString();
    const plan = {
      ...scanPlan("project-test", GEO_SCAN_TASK_BATCH_SIZE + 1, 1),
      claimedAt,
    };
    prepare.mockResolvedValue({ status: "planned", plan });
    const renewedAt = new Date().toISOString();
    renewClaim.mockResolvedValue(renewedAt);
    expect(await geoScanWorkflow({ organizationId: "org-test" })).toMatchObject(
      { status: "completed" }
    );
    expect(renewClaim).toHaveBeenCalledTimes(1);
    expect(renewClaim).toHaveBeenCalledWith(
      "project-test",
      claimedAt,
      expect.any(String)
    );
    expect(finalize).toHaveBeenCalledWith(
      plan.context,
      expect.anything(),
      "completed",
      renewedAt,
      { retried: false }
    );
  });

  test("finalizes a failed wave with the results its healthy siblings persisted", async () => {
    const plan = scanPlan("project-test", GEO_SCAN_TASK_BATCH_SIZE + 1);
    prepare.mockResolvedValue({ status: "planned", plan });
    taskBatch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                checks: 2,
                mentions: 1,
                dropped: 1,
                usage: EMPTY_AGENT_TOKEN_USAGE,
              }),
            5
          );
        })
    );
    taskBatch.mockRejectedValueOnce(new Error("Engine unavailable"));
    expect(await geoScanWorkflow({ organizationId: "org-test" })).toEqual({
      status: "completed",
      checks: 2,
      mentions: 1,
    });
    expect(finalize).toHaveBeenCalledWith(
      plan.context,
      {
        checks: 2,
        mentions: 1,
        dropped: 1,
        usage: { ...EMPTY_AGENT_TOKEN_USAGE, totalUsd: 0 },
      },
      "failed",
      plan.claimedAt,
      { retried: false, failureReason: "Error" }
    );
    expect(sequenceBatch).not.toHaveBeenCalled();
    expect(sleep).not.toHaveBeenCalled();
  });

  test("retries only projects without successful checks, acquiring a new scan rather than reusing the initial claim", async () => {
    listProjects.mockResolvedValue(["healthy", "empty"]);
    taskBatch.mockImplementation(async (context) => ({
      checks:
        context.projectId === "empty" && taskBatch.mock.calls.length <= 2
          ? 0
          : 1,
      mentions: 0,
      dropped: 0,
      usage: EMPTY_AGENT_TOKEN_USAGE,
    }));
    expect(
      await geoScanWorkflow({
        organizationId: "org-test",
        projectId: "empty",
        claimedAt: "2026-09-01T00:00:00.000Z",
        scanId: "old-scan",
        promptIds: ["prompt-0"],
        engines: ["openai/gpt-4.1"],
      })
    ).toEqual({ status: "completed", checks: 2, mentions: 0 });
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(GEO_SCAN_NO_RESULTS_RETRY_DELAY);
    expect(trackRetry).toHaveBeenCalledWith(
      "org-test",
      ["empty"],
      1,
      expect.any(Number)
    );
    expect(
      prepare.mock.calls.map(([, id, options]) => [id, options.retried])
    ).toEqual([
      ["empty", false],
      ["healthy", false],
      ["empty", true],
    ]);
    expect(prepare.mock.calls[2]?.[2]).toEqual({
      retried: true,
      promptIds: ["prompt-0"],
      engines: ["openai/gpt-4.1"],
    });
    // Each attempt leaves an activity-log entry: the failed first pass, the
    // healthy project, and the successful retry.
    expect(
      appendLog.mock.calls.map(([input]) => [
        input.integrationId,
        input.status,
        input.payload?.retried,
      ])
    ).toEqual([
      ["empty", "failed", false],
      ["healthy", "success", false],
      ["empty", "success", true],
    ]);
  });

  test("a second empty scan fails permanently instead of retrying indefinitely", async () => {
    taskBatch.mockResolvedValue({
      checks: 0,
      mentions: 0,
      dropped: 1,
      usage: EMPTY_AGENT_TOKEN_USAGE,
    });
    await expect(
      geoScanWorkflow({ organizationId: "org-test" })
    ).rejects.toBeInstanceOf(FatalError);
    expect(taskBatch).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(finalize.mock.calls.map(([, , status]) => status)).toEqual([
      "failed",
      "failed",
    ]);
  });

  test("a logging failure on the success path does not change the scan outcome", async () => {
    appendLog.mockRejectedValue(new Error("Redis unavailable"));
    const result = await geoScanWorkflow({ organizationId: "org-test" });
    expect(result).toMatchObject({ status: "completed" });
    expect(finalize.mock.calls.map(([, , status]) => status)).toEqual([
      "completed",
    ]);
    expect(appendLog).toHaveBeenCalledTimes(1);
  });

  test("a logging failure after a failed wave does not escalate the failure", async () => {
    const plan = scanPlan("project-test", GEO_SCAN_TASK_BATCH_SIZE + 1);
    prepare.mockResolvedValue({ status: "planned", plan });
    taskBatch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                checks: 2,
                mentions: 1,
                dropped: 1,
                usage: EMPTY_AGENT_TOKEN_USAGE,
              }),
            5
          );
        })
    );
    taskBatch.mockRejectedValueOnce(new Error("Engine unavailable"));
    appendLog.mockRejectedValue(new Error("Redis unavailable"));
    // The batch failure is already finalized as "failed"; the rejected log
    // append must not throw on top of it or alter the returned result.
    expect(await geoScanWorkflow({ organizationId: "org-test" })).toEqual({
      status: "completed",
      checks: 2,
      mentions: 1,
    });
    expect(finalize).toHaveBeenCalledWith(
      plan.context,
      expect.objectContaining({ checks: 2 }),
      "failed",
      plan.claimedAt,
      { retried: false, failureReason: "Error" }
    );
    expect(appendLog).toHaveBeenCalledTimes(1);
  });
});
