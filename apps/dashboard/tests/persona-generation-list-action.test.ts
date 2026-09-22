import { describe, expect, test } from "bun:test";

import { personaGenerationListAction } from "../src/utils/geo-persona-queries";

describe("personaGenerationListAction", () => {
  test("ignores jobs this tab did not start", () => {
    expect(
      personaGenerationListAction({ id: "job-1", status: "completed" }, null)
    ).toBe("ignore");
    expect(
      personaGenerationListAction({ id: "job-1", status: "completed" }, "job-2")
    ).toBe("ignore");
  });

  test("waits while the started job is still running", () => {
    expect(
      personaGenerationListAction({ id: "job-1", status: "queued" }, "job-1")
    ).toBe("wait");
    expect(
      personaGenerationListAction({ id: "job-1", status: "running" }, "job-1")
    ).toBe("wait");
  });

  test("refreshes the list when the started job completes", () => {
    expect(
      personaGenerationListAction({ id: "job-1", status: "completed" }, "job-1")
    ).toBe("refresh");
  });

  test("fails when the started job errors", () => {
    expect(
      personaGenerationListAction({ id: "job-1", status: "failed" }, "job-1")
    ).toBe("fail");
  });
});
