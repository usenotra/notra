import { beforeEach, describe, expect, mock, test } from "bun:test";

const insertValues = mock(() => ({
  onConflictDoNothing: () => ({
    returning: async () => [{ id: "mapping-id" }],
  }),
}));
const acquireLock = mock(async () => true);
const releaseLock = mock(async () => undefined);

mock.module("@notra/db/drizzle", () => ({
  db: { insert: () => ({ values: insertValues }) },
}));
mock.module("@notra/ai/utils/agent-session-lock", () => ({
  acquireAgentSendLock: acquireLock,
  releaseAgentSendLock: releaseLock,
}));

const { createAgentSessionWithMapping, forwardAgentFollowUp } =
  await import("./agent-proxy");

beforeEach(() => {
  insertValues.mockClear();
  acquireLock.mockClear();
  releaseLock.mockClear();
});

describe("Eve ID-addressed session protocol", () => {
  test("maps an accepted task without a continuation token", async () => {
    const fetchUpstream = mock(async () =>
      Response.json(
        { ok: true, sessionId: "eve-session", status: "accepted" },
        { status: 202 }
      )
    );

    const result = await createAgentSessionWithMapping({
      fetchUpstream,
      scope: { organizationId: "org-id", surface: "schedule" },
      message: "Write the daily blog post",
      mode: "task",
      outputSchema: { type: "object" },
    });

    expect(result).toEqual({
      agentSessionId: "mapping-id",
      eveSessionId: "eve-session",
    });
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-id",
        eveSessionId: "eve-session",
      })
    );
    expect(fetchUpstream).toHaveBeenCalledWith(
      "/eve/v1/session",
      expect.objectContaining({
        body: JSON.stringify({
          message: "Write the daily blog post",
          mode: "task",
          outputSchema: { type: "object" },
        }),
      })
    );
  });

  test("rejects a malformed success response before storing a mapping", async () => {
    await expect(
      createAgentSessionWithMapping({
        fetchUpstream: async () => Response.json({ ok: true }),
        scope: { organizationId: "org-id", surface: "schedule" },
        message: "Write a post",
        mode: "task",
      })
    ).rejects.toThrow();
    expect(insertValues).not.toHaveBeenCalled();
  });

  test("sends follow-ups by session ID without a legacy token", async () => {
    const fetchUpstream = mock(async () =>
      Response.json({ ok: true, sessionId: "eve-session" }, { status: 202 })
    );
    const inputResponses = [{ requestId: "approval", optionId: "approve" }];
    const response = await forwardAgentFollowUp({
      fetchUpstream,
      eveSessionId: "eve-session",
      inputResponses,
    });

    expect(response.status).toBe(202);
    expect(fetchUpstream).toHaveBeenCalledWith("/eve/v1/session/eve-session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ inputResponses }),
    });
    expect(releaseLock).toHaveBeenCalledWith("eve-session");
  });
});
