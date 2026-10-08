/// <reference lib="es2024.promise" />
import { afterAll, beforeEach, expect, mock, spyOn, test } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { WORKFLOW_OPTIMIZATION_BASELINE_SHA } from "../../../tests/constants/workflow-optimizations";

if (process.env.NOTRA_WORKFLOW_IO_WORKER !== "1") {
  test("isolated agent and X regressions", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: {
          PATH: process.env.PATH,
          HOME: process.env.HOME,
          TMPDIR: process.env.TMPDIR,
          NODE_ENV: "test",
          NOTRA_WORKFLOW_IO_WORKER: "1",
        },
        timeout: 25_000,
      }
    );
    expect(result.status, result.stderr.toString()).toBe(0);
  }, 30_000);
} else {
  globalThis.fetch = mock(() => {
    throw new Error("External network is forbidden");
  });
  process.env.EVE_NOTRA_AGENT_URL = "https://agent.example.invalid";
  process.env.EVE_NOTRA_AGENT_PASSWORD = "synthetic-password";
  process.env.TWITTER_BEARER_TOKEN = "synthetic-token";
  const statuses: string[] = [];
  const scopes: unknown[] = [];
  let streamFetch = async (_path: string, _init: RequestInit) =>
    new Response("");
  mock.module("@notra/db/drizzle", () => ({
    db: {
      update: () => ({
        set: ({ status }: { status: string }) => ({
          where: async () => {
            statuses.push(status);
          },
        }),
      }),
    },
  }));
  const { pgTable, text } = await import("drizzle-orm/pg-core");
  mock.module("@notra/db/schema", () => ({
    agentSessions: pgTable("agent_sessions", { id: text("id") }),
  }));
  mock.module("@vercel/oidc", () => ({ getVercelOidcToken: async () => null }));
  mock.module("@notra/ai/utils/agent-proxy", () => ({
    createAgentSessionWithMapping: async (input: unknown) => {
      scopes.push(input);
      return {
        agentSessionId: "local-demo-session",
        eveSessionId: "eve-demo-session",
      };
    },
  }));
  mock.module("eve/client", () => ({
    Client: class {
      fetch(path: string, init: RequestInit) {
        return streamFetch(path, init);
      }
    },
  }));
  mock.module("@/constants/agent", () => ({
    AGENT_CREATE_SESSION_PATH: "/eve/v1/session",
    AGENT_TASK_POLL_INTERVAL_MS: 1,
    AGENT_TASK_TIMEOUT_MS: 100,
    AGENT_TRAILING_SLASH_PATTERN: /\/+$/,
  }));
  let twitterFetch = async (_url: string) =>
    new Response("{}", { status: 200 });
  mock.module("@/utils/twitter-fetcher", () => ({
    twitterAppFetch: (url: string) => twitterFetch(url),
  }));
  const baselines = [
    "apps/dashboard/src/lib/agent/client",
    "apps/dashboard/src/lib/analytics/twitter-sync",
  ];
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  for (const path of baselines) {
    const output = `${root}${path}.isolated-baseline.ts`;
    if (existsSync(output)) {
      throw new Error(`Refusing to overwrite ${output}`);
    }
    writeFileSync(
      output,
      execFileSync(
        "git",
        ["show", `${WORKFLOW_OPTIMIZATION_BASELINE_SHA}:${path}.ts`],
        {
          cwd: fileURLToPath(new URL("../../../", import.meta.url)),
        }
      )
    );
  }
  afterAll(() => {
    for (const path of baselines) {
      unlinkSync(`${root}${path}.isolated-baseline.ts`);
    }
  });
  const candidate = await import("../src/lib/agent/client");
  const baselinePath = "../src/lib/agent/client.isolated-baseline.ts";
  const baseline: typeof candidate = await import(baselinePath);
  const twitter = await import("../src/lib/analytics/twitter-sync");
  const twitterBaselinePath =
    "../src/lib/analytics/twitter-sync.isolated-baseline.ts";
  const twitterBaseline: typeof twitter = await import(twitterBaselinePath);
  const { readAgentTaskStream } =
    await import("../src/utils/read-agent-task-stream");
  const input = {
    scope: { organizationId: "demo-org", surface: "task" as const },
    message: "synthetic task",
  };
  const encoder = new TextEncoder();
  beforeEach(() => {
    statuses.length = 0;
    scopes.length = 0;
  });

  test.each([
    '{"type":"result.completed","data":{"output":{"text":"Grüße 🌍"}}}\n{"type":"session.completed"}\n',
    'invalid\n{"type":1}\n{"type":"result.completed","data":{"result":42}}\r\n{"type":"session.completed"}',
    '{"type":"session.completed"}\n{"type":"session.failed","data":{"message":"bad"}}\n',
    '{"type":"session.failed"}\n',
    '{"type":"result.completed","data":{"output":null,"result":false}}\n{"type":"session.completed"}',
    '{"type":"session.completed"}\n{"type":"session.failed","data":{"message":""}}\n',
  ])("stream compatibility: %s", async (transcript) => {
    streamFetch = async () => new Response(transcript);
    let original: unknown;
    try {
      original = await baseline.runAgentTask(input);
    } catch (error) {
      original = (error as Error).message;
    }
    const expectedStatus = [...statuses];
    statuses.length = 0;
    const bytes = encoder.encode(transcript);
    let index = 0;
    streamFetch = async () =>
      new Response(
        new ReadableStream({
          pull(controller) {
            if (index < bytes.length) {
              controller.enqueue(bytes.slice(index, ++index));
            } else {
              controller.close();
            }
          },
        })
      );
    let changed: unknown;
    try {
      changed = await candidate.runAgentTask(input);
    } catch (error) {
      changed = (error as Error).message;
    }
    expect(changed).toEqual(original);
    expect(statuses).toEqual(expectedStatus);
  });
  test("silent open body is cancelled and the mapped session times out", async () => {
    let cancelled = false;
    streamFetch = async (_path, init) => {
      expect(init.signal).toBeInstanceOf(AbortSignal);
      return new Response(
        new ReadableStream({
          cancel() {
            cancelled = true;
          },
        })
      );
    };
    await expect(candidate.runAgentTask(input)).rejects.toThrow(
      "did not complete in time"
    );
    expect(statuses).toEqual(["timed_out"]);
    expect(cancelled).toBe(true);
    expect(scopes).toHaveLength(1);
  });
  test("baseline can complete after deadline; candidate cannot", async () => {
    const clock = spyOn(Date, "now").mockReturnValue(1000);
    try {
      for (const [implementation, expected] of [
        [baseline, "completed"],
        [candidate, "timed_out"],
      ] as const) {
        clock.mockReturnValue(1000);
        statuses.length = 0;
        const opened = Promise.withResolvers<void>();
        let finish = () => {};
        streamFetch = async () =>
          new Response(
            new ReadableStream({
              start(controller) {
                finish = () => {
                  controller.enqueue(
                    encoder.encode('{"type":"session.completed"}\n')
                  );
                  controller.close();
                };
              },
              pull() {
                opened.resolve();
              },
            })
          );
        const task = implementation.runAgentTask(input).catch((error) => error);
        await opened.promise;
        clock.mockReturnValue(1200);
        finish();
        await task;
        expect(statuses).toEqual([expected]);
      }
    } finally {
      clock.mockRestore();
    }
  });
  test("incremental reader never calls response.text and cancels on abort", async () => {
    const controller = new AbortController();
    let cancelled = false;
    const response = new Response(
      new ReadableStream({
        cancel() {
          cancelled = true;
        },
      })
    );
    response.text = () => {
      throw new Error("Whole-body buffering forbidden");
    };
    const reading = readAgentTaskStream(
      response,
      controller.signal,
      Date.now() + 1000
    );
    controller.abort(new Error("test abort"));
    await expect(reading).rejects.toThrow("test abort");
    expect(cancelled).toBe(true);
  });
  test("large progress transcript is parsed without retaining a whole-body string", async () => {
    let index = 0;
    const response = new Response(
      new ReadableStream({
        pull(controller) {
          if (index++ < 20_000) {
            controller.enqueue(
              encoder.encode(
                '{"type":"progress","data":{"text":"synthetic"}}\n'
              )
            );
          } else {
            controller.enqueue(
              encoder.encode(
                '{"type":"result.completed","data":{"output":7}}\n{"type":"session.completed"}'
              )
            );
            controller.close();
          }
        },
      })
    );
    response.text = () => {
      throw new Error("Whole-body buffering forbidden");
    };
    expect(
      await readAgentTaskStream(
        response,
        new AbortController().signal,
        Date.now() + 10_000
      )
    ).toEqual({ output: 7 });
  });
  test("nonterminal streams retry without creating another session", async () => {
    let calls = 0;
    streamFetch = async () =>
      new Response(
        ++calls === 1
          ? '{"type":"progress"}\n'
          : '{"type":"session.completed"}\n'
      );
    await candidate.runAgentTask(input);
    expect(calls).toBe(2);
    expect(scopes).toHaveLength(1);
  });
  test("ordinary fetch errors propagate rather than becoming timeouts", async () => {
    streamFetch = async () => {
      throw new Error("synthetic transport failure");
    };
    await expect(candidate.runAgentTask(input)).rejects.toThrow(
      "synthetic transport failure"
    );
    expect(statuses).toEqual([]);
  });

  test("X deduplicates public reads but preserves tenant-specific rows and pagination", async () => {
    const accounts = Array.from({ length: 6 }, (_, index) => ({
      id: `account-${index}`,
      organizationId: `org-${index}`,
      provider: "twitter",
      providerAccountId: "demo-user",
      username: index % 2 ? "Demo" : "demo",
      displayName: null,
      profileImageUrl: null,
      verified: false,
    }));
    const capturedAt = new Date("2026-01-01T00:00:00Z");
    let timelineCalls = 0;
    let usernames: string[] = [];
    twitterFetch = async (address) => {
      const url = new URL(address);
      if (url.pathname === "/2/users/by") {
        usernames = url.searchParams.get("usernames")?.split(",") ?? [];
        return Response.json({
          data: [
            {
              id: "demo-user",
              username: "demo",
              public_metrics: { followers_count: 5 },
            },
          ],
        });
      }
      timelineCalls += 1;
      const last = url.searchParams.has("pagination_token");
      return Response.json({
        data: [{ id: last ? "tweet-2" : "tweet-1", text: "synthetic" }],
        meta: last ? {} : { next_token: "next" },
      });
    };
    const original = await twitterBaseline.collectTwitterRows(
      accounts,
      capturedAt
    );
    expect(timelineCalls).toBe(12);
    timelineCalls = 0;
    const changed = await twitter.collectTwitterRows(accounts, capturedAt);
    expect(changed).toEqual(original);
    expect(timelineCalls).toBe(2);
    expect(usernames).toEqual(["demo"]);
    expect(new Set(changed.posts.map((row) => row.organization_id)).size).toBe(
      6
    );
    expect(changed.posts).toHaveLength(12);
    console.log(
      "X fixture: 12 -> 2 timeline reads, identical 12 organization-specific post rows"
    );
    timelineCalls = 0;
    await twitter.collectTwitterRows(accounts, capturedAt);
    expect(timelineCalls).toBe(2);
  });
  test("X missing users and empty/unconfigured input remain empty", async () => {
    twitterFetch = async () => Response.json({ data: [] });
    expect(await twitter.collectTwitterRows([], new Date())).toEqual({
      accountStats: [],
      posts: [],
      postStats: [],
    });
  });
  test.each([
    "missing-user",
    "user-error",
    "timeline-error",
    "partial-page-error",
    "page-cap",
  ] as const)(
    "X preserves %s behavior and does not merge organization rows",
    async (scenario) => {
      const accounts = Array.from({ length: 3 }, (_, index) => ({
        id: `demo-${index}`,
        organizationId: `org-${index}`,
        provider: "twitter",
        providerAccountId: "demo-user",
        username: "demo",
        displayName: null,
        profileImageUrl: null,
        verified: false,
      }));
      twitterFetch = async (address) => {
        const url = new URL(address);
        if (url.pathname === "/2/users/by") {
          if (scenario === "user-error") {
            return new Response("", { status: 429 });
          }
          return Response.json({
            data:
              scenario === "missing-user"
                ? []
                : [{ id: "demo-user", username: "demo" }],
          });
        }
        if (
          scenario === "timeline-error" ||
          (scenario === "partial-page-error" &&
            url.searchParams.has("pagination_token"))
        ) {
          return new Response("", { status: 429 });
        }
        return Response.json({
          data: [{ id: "tweet", text: "synthetic" }],
          meta: { next_token: "next" },
        });
      };
      const capturedAt = new Date("2026-01-01T00:00:00Z");
      expect(await twitter.collectTwitterRows(accounts, capturedAt)).toEqual(
        await twitterBaseline.collectTwitterRows(accounts, capturedAt)
      );
    }
  );
}
