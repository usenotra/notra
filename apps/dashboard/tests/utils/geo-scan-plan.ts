import type { GeoScanProjectPlan } from "@notra/geo-core/types/geo";

export function scanPlan(
  projectId = "project-test",
  taskCount = 1,
  sequenceCount = 0
): GeoScanProjectPlan {
  return {
    context: {
      organizationId: "org-test",
      projectId,
      scanId: `scan-${projectId}`,
      runId: "run-test",
      companyName: "Notra",
      aliases: [],
      startedAtMs: 0,
      gate: {
        allowed: true,
        mode: "unmetered",
        featureId: null,
        reserved: false,
        lockId: null,
        useMarkup: false,
      },
    },
    claimedAt: "2026-09-01T00:00:00.000Z",
    tasks: Array.from({ length: taskCount }, (_, index) => ({
      engine: "test/engine",
      groundedKey: null,
      language: "English",
      zdr: "none",
      prompt: { id: `prompt-${index}`, text: `Test question ${index}` },
    })),
    sequences: Array.from({ length: sequenceCount }, (_, index) => ({
      sequenceId: `sequence-${index}`,
      steps: ["First question", "Follow up"],
      engine: "test/engine",
      groundedKey: null,
      zdr: "none",
    })),
    promptCount: taskCount,
    personas: [],
    languages: ["English"],
    engines: ["test/engine"],
  };
}
