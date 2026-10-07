import { afterEach, beforeEach, expect, mock, spyOn, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import type { AppendAutomationLogInput } from "@/types/workflows/content-generation-steps";

if (process.env.NOTRA_AUTOMATION_LOG_TEST !== "1") {
  test("automation logging preserves workflow outcomes", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: { ...process.env, NOTRA_AUTOMATION_LOG_TEST: "1" },
        timeout: 15_000,
      }
    );
    expect(result.status, result.stderr.toString()).toBe(0);
  }, 20_000);
} else {
  const appendLog = mock(async (_input: unknown) => undefined);
  const input: AppendAutomationLogInput = {
    organizationId: "org-test",
    integrationId: "integration-test",
    integrationType: "github",
    title: "Workflow completed",
    status: "success",
    payload: { scanId: "scan-test" },
    referenceId: "run-test",
    retentionDays: 30,
  };
  mock.module("@/workflows/runtime", () => ({
    registerWorkflowRuntime: async () => undefined,
  }));
  mock.module("@/lib/webhooks/logging", () => ({
    appendWebhookLog: appendLog,
  }));
  const { appendAutomationLogBestEffort } =
    await import("./content-generation-steps");
  const stderr = spyOn(console, "error").mockImplementation(() => undefined);
  beforeEach(() => {
    appendLog.mockClear();
    appendLog.mockResolvedValue(undefined);
    stderr.mockClear();
  });
  afterEach(() => {
    expect(appendLog).toHaveBeenCalledTimes(1);
  });

  test("awaits and records successful activity without fallback output", async () => {
    await expect(appendAutomationLogBestEffort(input)).resolves.toBeUndefined();
    expect(appendLog).toHaveBeenCalledWith({ ...input, statusCode: null });
    expect(stderr).not.toHaveBeenCalled();
  });

  test("reports a rejected activity step without failing the workflow", async () => {
    const failure = new Error("activity storage unavailable");
    appendLog.mockRejectedValueOnce(failure);
    await expect(appendAutomationLogBestEffort(input)).resolves.toBeUndefined();
    expect(stderr).toHaveBeenCalledWith(
      "[ActivityLog] Failed to record activity log",
      failure
    );
  });
}
