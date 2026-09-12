import { beforeEach, describe, expect, mock, test } from "bun:test";

import type { ContentGenerationJob } from "@notra/content-generation/schemas";
import { InternalDashboardError } from "@notra/schemas/api/internal-dashboard";

import { isConfirmedWorkflowTriggerRejection } from "../src/utils/brand-analysis";

const sampleJob: ContentGenerationJob = {
  id: "job_test123",
  organizationId: "org_test",
  status: "queued",
  contentType: "blog_post",
  lookbackWindow: "last_7_days",
  repositoryIds: [],
  brandVoiceId: null,
  workflowRunId: null,
  postId: null,
  error: null,
  source: "api",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  completedAt: null,
};

const collectionDeleteCalls = mock(async () => undefined);
const createJob = mock(
  async (_redis: unknown, job: ContentGenerationJob) => job
);
const addActive = mock(async () => undefined);
const appendEvent = mock(async (_redis: unknown, event: unknown) => event);
const triggerWorkflow = mock(async () => "workflow-run-id");
const updateJob = mock(
  async (
    _redis: unknown,
    jobId: string,
    updates: Partial<ContentGenerationJob>
  ) => ({
    ...sampleJob,
    ...updates,
    id: jobId,
  })
);
const setJobStatus = mock(
  async (
    _redis: unknown,
    jobId: string,
    status: ContentGenerationJob["status"],
    updates?: Partial<ContentGenerationJob>
  ) => ({
    ...sampleJob,
    id: jobId,
    status,
    ...updates,
  })
);

const mockDb = {
  insert: mock(() => ({
    values: mock(async () => undefined),
  })),
  delete: mock(() => ({
    where: mock(async () => {
      await collectionDeleteCalls();
      return [];
    }),
  })),
};

mock.module("@notra/content-generation/jobs", () => ({
  createContentGenerationJobId: () => "job_test123",
  createContentGenerationJob: createJob,
  updateContentGenerationJob: updateJob,
  setContentGenerationJobStatus: setJobStatus,
  appendContentGenerationJobEvent: appendEvent,
  getContentGenerationJob: mock(async () => null),
  listContentGenerationJobEvents: mock(async () => []),
}));

mock.module("../src/utils/active-generations", () => ({
  addActiveGeneration: addActive,
}));

mock.module("../src/utils/content-generation", () => ({
  triggerContentGenerationWorkflow: triggerWorkflow,
  isConfirmedContentGenerationRejection: (error: unknown) => {
    if (isConfirmedWorkflowTriggerRejection(error)) {
      return true;
    }

    return (
      error instanceof Error &&
      error.message === "Content generation workflow URL is not configured"
    );
  },
}));

const { createPostGeneration } = await import("../src/programs/posts");
const { runPostProgram, respondToPostFailure } =
  await import("../src/utils/posts");

function generationInput() {
  return {
    db: mockDb as never,
    organizationId: "org_test",
    body: {
      contentType: "blog_post" as const,
      lookbackWindow: "last_7_days" as const,
      dataPoints: {
        includePullRequests: true,
        includeCommits: true,
        includeReleases: true,
        includeLinearData: false,
      },
    },
    redis: {} as never,
    runtimeEnv: { WORKFLOW_BASE_URL: "https://example.test" },
    repositoryIds: undefined,
    linearIntegrationIds: undefined,
    resolvedBrandVoiceId: null,
  };
}

beforeEach(() => {
  collectionDeleteCalls.mockClear();
  createJob.mockClear();
  addActive.mockClear();
  appendEvent.mockClear();
  triggerWorkflow.mockReset();
  updateJob.mockReset();
  setJobStatus.mockReset();
  mockDb.insert.mockClear();
  mockDb.delete.mockClear();

  createJob.mockImplementation(async (_redis, job) => job);
  addActive.mockResolvedValue(undefined);
  appendEvent.mockImplementation(async (_redis, event) => event);
  triggerWorkflow.mockResolvedValue("workflow-run-id");
  updateJob.mockImplementation(async (_redis, jobId, updates) => ({
    ...sampleJob,
    ...updates,
    id: jobId,
  }));
  setJobStatus.mockImplementation(async (_redis, jobId, status, updates) => ({
    ...sampleJob,
    id: jobId,
    status,
    ...updates,
  }));
});

describe("createPostGeneration rollback", () => {
  test("deletes the collection when workflow trigger is explicitly rejected", async () => {
    triggerWorkflow.mockRejectedValueOnce(
      new InternalDashboardError(402, "payment_required", "credits exhausted")
    );

    const result = await runPostProgram(
      createPostGeneration(generationInput())
    );

    expect(result._tag).toBe("Failure");
    if (result._tag === "Failure") {
      expect(result.failure._tag).toBe("PostGenerationQueueFailedError");
    }
    expect(collectionDeleteCalls).toHaveBeenCalledTimes(1);
    expect(setJobStatus).toHaveBeenCalledWith(
      expect.anything(),
      "job_test123",
      "failed",
      expect.objectContaining({ error: expect.any(String) })
    );
  });

  test("keeps the collection when workflow trigger response is ambiguous", async () => {
    triggerWorkflow.mockRejectedValueOnce(
      new InternalDashboardError(500, null, "upstream unavailable")
    );

    const result = await runPostProgram(
      createPostGeneration(generationInput())
    );

    expect(result._tag).toBe("Failure");
    expect(collectionDeleteCalls).not.toHaveBeenCalled();
    expect(setJobStatus).toHaveBeenCalled();
  });

  test("keeps the collection when redis fails after workflow acceptance", async () => {
    updateJob.mockRejectedValueOnce(new Error("redis unavailable"));

    const result = await runPostProgram(
      createPostGeneration(generationInput())
    );

    expect(result._tag).toBe("Failure");
    if (result._tag === "Failure") {
      expect(result.failure._tag).toBe("PostGenerationQueueFailedError");
    }
    expect(collectionDeleteCalls).not.toHaveBeenCalled();
    expect(triggerWorkflow).toHaveBeenCalled();
  });

  test("still returns queue failure when redis status update fails during compensation", async () => {
    triggerWorkflow.mockRejectedValueOnce(new Error("network reset"));
    setJobStatus.mockRejectedValueOnce(new Error("redis write failed"));

    const result = await runPostProgram(
      createPostGeneration(generationInput())
    );

    expect(result._tag).toBe("Failure");
    if (result._tag === "Failure") {
      expect(result.failure._tag).toBe("PostGenerationQueueFailedError");
      expect(result.failure.jobId).toBeUndefined();
    }

    const mockContext = {
      json: (body: unknown, status: number) => ({ body, status }),
    };
    const response = respondToPostFailure(
      mockContext as never,
      result._tag === "Failure" ? result.failure : (null as never)
    );
    expect(response).toEqual({
      body: { error: "Failed to queue content generation" },
      status: 503,
    });
  });

  test("deletes the collection when job creation fails before workflow acceptance", async () => {
    createJob.mockRejectedValueOnce(new Error("redis unavailable"));

    const result = await runPostProgram(
      createPostGeneration(generationInput())
    );

    expect(result._tag).toBe("Failure");
    expect(collectionDeleteCalls).toHaveBeenCalledTimes(1);
    expect(setJobStatus).not.toHaveBeenCalled();
  });
});
