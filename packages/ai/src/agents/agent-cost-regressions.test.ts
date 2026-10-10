import { beforeEach, expect, mock, setSystemTime, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { LanguageModelV4GenerateResult } from "@ai-sdk/provider";
import type { BackgroundGenOptions } from "@notra/ai/types/agents";
import type {
  GenerateGeoContentBriefOptions,
  RunGeoWriterOptions,
} from "@notra/ai/types/geo-writer";
import { Box } from "@upstash/box";
import { tool } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { z } from "zod";

import type { RepoImageBox } from "./repo-image-agent";

// Module mocks must never leak into other suites. This also makes the fixture
// runnable with ordinary `bun test`, without relying on --isolate.
if (process.env.NOTRA_AGENT_COST_TEST_CHILD !== "1") {
  // The child suite exercises several real cancellation-confirmation waits.
  test("agent cost regressions use isolated, offline production agents", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: { ...process.env, NOTRA_AGENT_COST_TEST_CHILD: "1" },
      }
    );
    if (result.stdout.length) {
      console.log(result.stdout.toString().trim());
    }
    expect(result.status, result.stderr.toString()).toBe(0);
  }, 30_000);
} else {
  setSystemTime(new Date("2026-10-10T12:00:00.000Z"));
  // Any accidental external request is a test failure, even with local keys set.
  globalThis.fetch = mock(() => {
    throw new Error("Network access is forbidden in agent cost fixtures");
  }) as typeof fetch;
  const forbiddenFetch = globalThis.fetch;

  const brief = {
    targetPrompt: "How do webhook retries work?",
    intent: "Explain retries",
    contentSubtype: "guide" as const,
    workingTitle: "Webhook retries",
    audience: "Developers",
    jobToBeDone: "Configure retries",
    sections: ["Delivery", "Retry policy", "Failure handling"].map(
      (heading) => ({
        heading,
        goal: "Explain the behavior",
        claims: ["Use verified facts"],
      })
    ),
    questionsToAnswer: ["When does delivery stop?"],
    internalLinks: [],
    acceptanceChecklist: ["Use sourced facts"],
  };
  const draft =
    `${brief.sections.map((section) => `## ${section.heading}\nVerified facts.`).join("\n\n")}\n\n${"A sourced paragraph with a [link](https://example.com).\n".repeat(200)}`.trim();
  const plannerOptions: GenerateGeoContentBriefOptions = {
    organizationId: "fixture-org",
    input: {
      topic: "Webhook retries",
      brand: { companyName: "Fixture", aliases: [] },
      competitors: [],
      gapPrompts: [],
      sitemapPages: [],
    },
  };
  const writerOptions: RunGeoWriterOptions = {
    organizationId: "fixture-org",
    projectId: "fixture-project",
    brandSettingsId: "fixture-brand",
    collectionId: "fixture-collection",
    topic: "Webhook retries",
    brandName: "Fixture",
    brief,
  };
  const backgroundOptions: BackgroundGenOptions = {
    organizationId: "fixture-org",
    collectionId: "fixture-collection",
    skillName: "blog-post",
    contentType: "blog_post",
    brandAgentType: "blog",
    contentLabel: "blog post",
    repositories: [
      { integrationId: "fixture-repo", owner: "fixture", repo: "repo" },
    ],
    promptInput: {
      sourceTargets: "fixture/repo",
      todayUtc: "2026-10-10",
      lookbackLabel: "one week",
      lookbackStartIso: "2026-10-03T00:00:00Z",
      lookbackEndIso: "2026-10-10T00:00:00Z",
    },
    resolveContext: async () => {
      throw new Error("Repository access is forbidden in this fixture");
    },
  };
  const modelUsage = {
    inputTokens: { total: 700, noCache: 600, cacheRead: 80, cacheWrite: 20 },
    outputTokens: { total: 80, text: 80, reasoning: 0 },
  };
  let models: MockLanguageModelV4[] = [];
  let savedPosts: Array<{ postId: string; title: string; markdown: string }> =
    [];
  let enrichmentFails = false;
  const trackImageUsage = mock(async () => undefined);

  const emptyTool = () =>
    tool({ inputSchema: z.object({}), execute: async () => ({}) });
  mock.module("@notra/ai/gateway", () => ({
    assertRouteHasCredits: async () => undefined,
    gateway: () => {
      throw new Error("Vision review unavailable in offline fixture");
    },
  }));
  mock.module("@notra/ai/model", () => ({
    createModel: () => {
      const model = models.shift();
      if (!model) {
        throw new Error("No model fixture configured");
      }
      return model;
    },
  }));
  mock.module("@notra/ai/utils/route-usage", () => ({
    summarizeRouteUsage: async () => {
      if (enrichmentFails) {
        throw new Error("Cost enrichment unavailable");
      }
      return { maxPromptTokens: 700, tokenCostUsd: 0.01 };
    },
  }));
  mock.module("@notra/ai/utils/server-log", () => ({
    logInfo: () => undefined,
    logWarn: () => undefined,
    logError: () => undefined,
  }));
  mock.module("@notra/ai/utils/tcc", () => ({
    buildTelemetryOptions: () => ({}),
  }));
  mock.module("@notra/db/drizzle", () => ({
    db: { query: { posts: { findFirst: async () => savedPosts[0] } } },
  }));
  // Use the real post tools (including validation and result-state mutations).
  mock.module("@notra/ai/utils/post-service", () => ({
    createPostRecord: async (input: { title: string; markdown: string }) => {
      const postId = `post-${savedPosts.length + 1}`;
      savedPosts.push({ postId, title: input.title, markdown: input.markdown });
      return { postId, deduplicated: false };
    },
    updatePostRecord: async (input: { postId: string; markdown?: string }) => {
      const post = savedPosts.find((entry) => entry.postId === input.postId);
      if (!post) {
        return { status: "not_found" };
      }
      if (input.markdown !== undefined) {
        post.markdown = input.markdown;
      }
      return { status: "updated" };
    },
    ensureChatPostCollection: async () => "fixture-collection",
  }));
  mock.module("@notra/ai/tools/brand-references", () => ({
    createGetBrandReferencesTool: emptyTool,
    createSearchBrandReferencesTool: emptyTool,
  }));
  mock.module("@notra/ai/tools/geo-context", () => ({
    createGetGeoContextTool: emptyTool,
  }));
  mock.module("@notra/ai/tools/sitemap", () => ({
    createGetSitemapPagesTool: emptyTool,
    createFetchSitemapPageTool: emptyTool,
  }));
  mock.module("@notra/ai/tools/skills", () => ({
    listAvailableSkills: emptyTool,
    getSkillByName: emptyTool,
  }));
  mock.module("@notra/ai/tools/github", () => ({
    buildGitHubDataTools: () => ({}),
  }));
  mock.module("@notra/ai/tools/linear", () => ({
    buildLinearDataTools: () => ({}),
  }));
  mock.module("@notra/ai/tools/web-search", () => ({
    registerWebSearchTools: (tools: Record<string, unknown>) => {
      tools.webSearch = tool({
        inputSchema: z.object({ query: z.string() }),
        execute: async () => ({ success: true, results: [] }),
      });
    },
  }));
  mock.module("@notra/ai/billing/autumn", () => ({
    autumn: { track: trackImageUsage },
    allowUnmeteredAiInDevelopment: false,
  }));
  mock.module("@notra/ai/chat/history", () => ({
    getChatProjectId: async () => null,
  }));
  mock.module("@notra/ai/jobs/collection-title", () => ({
    maybeGenerateCollectionTitle: async () => undefined,
  }));
  mock.module("@notra/ai/utils/image-assets", () => ({
    uploadGeneratedExcalidrawAsset: async () => "fixture",
    uploadGeneratedHtmlAsset: async () => "fixture",
    uploadGeneratedImageAsset: async () => "fixture",
  }));
  mock.module("@notra/posthog/server", () => ({
    captureServerEvent: () => undefined,
    flushPostHogServer: async () => undefined,
  }));
  mock.module("@notra/ai/utils/repo-image-render", () => ({
    renderHtmlToImages: async () => ({
      svg: "fixture-svg",
      pngBase64: "fixture-png",
    }),
  }));

  const geo = await import("./geo-writer");
  const background = await import("./background-gen");
  const image = await import("./repo-image-agent");
  const { marketingFormat } = await import("./repo-image-marketing");
  const { trackImageGenerationUsage } =
    await import("../utils/image-post-service");

  const textResponse = (
    text: string,
    finishReason: "stop" | "length" = "stop"
  ): LanguageModelV4GenerateResult => {
    return {
      content: [{ type: "text", text }],
      finishReason: { unified: finishReason, raw: finishReason },
      usage: modelUsage,
      warnings: [],
    };
  };

  const toolResponse = (
    toolName: string,
    input: unknown
  ): LanguageModelV4GenerateResult => {
    return {
      content: [
        {
          type: "tool-call",
          toolCallId: `call-${toolName}`,
          toolName,
          input: JSON.stringify(input),
        },
      ],
      finishReason: { unified: "tool-calls", raw: "tool_calls" },
      usage: modelUsage,
      warnings: [],
    };
  };

  const writerModel = (prefix: LanguageModelV4GenerateResult[] = []) => {
    return new MockLanguageModelV4({
      doGenerate: [
        ...prefix,
        toolResponse("webSearch", { query: brief.targetPrompt }),
        toolResponse("createBlogPost", {
          title: brief.workingTitle,
          slug: "webhook-retries",
          markdown: draft,
        }),
        textResponse("Saved"),
      ],
    });
  };

  const imageFixture = (
    failure?: Error,
    cost: unknown = {
      inputTokens: 700,
      outputTokens: 80,
      cachedInputTokens: 80,
      computeMs: 100,
      totalUsd: 0.01,
    },
    reported = true
  ) => {
    const events: string[] = [];
    let reads = 0;
    const stream = {
      id: "fixture-run",
      get cost() {
        reads++;
        return cost;
      },
      cancel: mock(async () => {
        events.push("cancel-start");
        await Promise.resolve();
        events.push("cancel-end");
      }),
      async *[Symbol.asyncIterator]() {
        yield { type: "tool-call", toolName: "write-file" };
        if (reported) {
          yield { type: "finish" };
        }
        if (failure) {
          throw failure;
        }
      },
    };
    const listRuns = mock(async () => {
      events.push("confirm-terminal");
      return [{ id: stream.id, status: "cancelled" }];
    });
    const box = {
      listRuns,
      agent: {
        stream: mock(async () => {
          events.push("stream-start");
          return stream;
        }),
      },
    } as unknown as RepoImageBox;
    return { box, stream, listRuns, events, reads: () => reads };
  };

  // Exercise the actual SDK stream parser, Run.cancel(), and Box.listRuns().
  // Only HTTP responses are replaced; no private SDK methods are called.
  const realSdkFixture = (
    status: "running" | "cancelled" | "completed" | "failed",
    cancelStatus = 200,
    reportedUsage = status === "completed"
  ) => {
    const requests: string[] = [];
    const box = new Box(
      { id: "fixture-box", status: "running", created_at: 0, updated_at: 0 },
      {
        baseUrl: "https://fixture.invalid",
        headers: {},
        timeout: 1000,
        debug: false,
        isAgentConfigured: true,
      }
    );
    globalThis.fetch = mock(
      async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
        const url = String(input);
        requests.push(`${init?.method} ${url}`);
        if (url.endsWith("/run/stream")) {
          let sent = false;
          return {
            ok: true,
            body: {
              getReader: () => ({
                read: async () => {
                  if (!sent) {
                    sent = true;
                    return {
                      done: false,
                      value: new TextEncoder().encode(
                        'event: run_start\ndata: {"run_id":"backend-run"}\n\nevent: tool\ndata: {"name":"write-file"}\n\n'
                      ),
                    };
                  }
                  throw new DOMException("Offline timeout", "AbortError");
                },
                cancel: async () => undefined,
              }),
            },
          } as unknown as Response;
        }
        if (url.endsWith("/runs/backend-run/cancel")) {
          return new Response(
            JSON.stringify({ error: "Cancellation rejected" }),
            { status: cancelStatus }
          );
        }
        if (url.endsWith("/runs")) {
          return Response.json({
            runs: [
              {
                id: "backend-run",
                box_id: box.id,
                customer_id: "fixture",
                type: "agent",
                status,
                input_tokens: reportedUsage ? 700 : 0,
                output_tokens: reportedUsage ? 80 : 0,
                cost_usd: reportedUsage ? 0.01 : 0,
                duration_ms: 100,
                created_at: 0,
              },
            ],
          });
        }
        throw new Error(`Unexpected offline SDK request: ${url}`);
      }
    ) as unknown as typeof fetch;
    let sdkStream:
      | Awaited<ReturnType<RepoImageBox["agent"]["stream"]>>
      | undefined;
    const stream = box.agent.stream.bind(box.agent);
    box.agent.stream = async (options) => {
      sdkStream = await stream(options);
      return sdkStream;
    };
    return { box, requests, stream: () => sdkStream };
  };

  beforeEach(() => {
    models = [];
    savedPosts = [];
    enrichmentFails = false;
    trackImageUsage.mockClear();
    globalThis.fetch = forbiddenFetch;
  });

  test("GEO stops after successful save, leaving the full humanizer pass intact", async () => {
    const writer = writerModel();
    const humanizer = new MockLanguageModelV4({
      doGenerate: textResponse(draft),
    });
    models = [writer, humanizer];
    const result = await geo.runGeoWriter(writerOptions);
    expect(writer.doGenerateCalls).toHaveLength(2);
    expect(humanizer.doGenerateCalls).toHaveLength(1);
    expect(savedPosts).toEqual([
      { postId: "post-1", title: brief.workingTitle, markdown: draft },
    ]);
    expect(result).toMatchObject({
      postId: "post-1",
      title: brief.workingTitle,
      humanized: true,
    });
  });

  test("GEO rejected research and heading gates do not trigger the save stop condition", async () => {
    const writer = new MockLanguageModelV4({
      doGenerate: [
        toolResponse("createBlogPost", {
          title: brief.workingTitle,
          markdown: draft,
        }),
        toolResponse("webSearch", { query: brief.targetPrompt }),
        toolResponse("createBlogPost", {
          title: brief.workingTitle,
          markdown: "## Delivery\nIncomplete",
        }),
        toolResponse("createBlogPost", {
          title: brief.workingTitle,
          markdown: draft,
        }),
        textResponse("Should never run"),
      ],
    });
    models = [
      writer,
      new MockLanguageModelV4({ doGenerate: textResponse(draft) }),
    ];
    await geo.runGeoWriter(writerOptions);
    expect(writer.doGenerateCalls).toHaveLength(4);
    expect(savedPosts).toHaveLength(1);
    expect(JSON.stringify(writer.doGenerateCalls[1]?.prompt)).toContain(
      "Call webSearch successfully"
    );
    expect(JSON.stringify(writer.doGenerateCalls[3]?.prompt)).toContain(
      "Missing: Retry policy, Failure handling"
    );
  });

  test("GEO fail stops without a follow-up generation", async () => {
    const writer = new MockLanguageModelV4({
      doGenerate: [
        toolResponse("fail", { reason: "Research unavailable" }),
        textResponse("Should never run"),
      ],
    });
    models = [writer];
    await expect(geo.runGeoWriter(writerOptions)).rejects.toThrow(
      "Research unavailable"
    );
    expect(writer.doGenerateCalls).toHaveLength(1);
    expect(savedPosts).toHaveLength(0);
  });

  test("background generation still creates multiple posts and updates them", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: [
        toolResponse("createPost", { title: "First", markdown: "First draft" }),
        toolResponse("createPost", {
          title: "Second",
          markdown: "Second draft",
        }),
        toolResponse("updatePost", {
          postId: "post-1",
          markdown: "Revised first draft",
        }),
        textResponse("Saved"),
      ],
    });
    models = [model];
    const result = await background.runBackgroundGen(backgroundOptions);
    expect(model.doGenerateCalls).toHaveLength(4);
    expect(result.posts.map((post) => post.postId)).toEqual([
      "post-1",
      "post-2",
    ]);
    expect(savedPosts[0]?.markdown).toBe("Revised first draft");
  });

  test.each(["skip", "fail"] as const)(
    "background %s stops after one model call",
    async (terminal) => {
      const model = new MockLanguageModelV4({
        doGenerate: [
          toolResponse(terminal, { reason: "No source material" }),
          textResponse("Should never run"),
        ],
      });
      models = [model];
      await expect(
        background.runBackgroundGen(backgroundOptions)
      ).rejects.toThrow("No source material");
      expect(model.doGenerateCalls).toHaveLength(1);
    }
  );

  test("planner invalid output repairs once and counts both attempts exactly once", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: [
        textResponse("not-json"),
        textResponse(JSON.stringify(brief)),
      ],
    });
    models = [model];
    const result = await geo.generateGeoContentBrief(plannerOptions);
    expect(result.brief).toMatchObject(brief);
    expect(model.doGenerateCalls).toHaveLength(2);
    expect(result.usage).toMatchObject({
      inputTokens: 1200,
      outputTokens: 160,
      totalTokens: 1560,
      cacheReadTokens: 160,
      cacheWriteTokens: 40,
      tokenCostUsd: 0.02,
    });
    expect(JSON.stringify(model.doGenerateCalls[1]?.prompt)).toContain(
      "not-json"
    );
  });

  test("planner valid first output is counted once", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: textResponse(JSON.stringify(brief)),
    });
    models = [model];
    const result = await geo.generateGeoContentBrief(plannerOptions);
    expect(model.doGenerateCalls).toHaveLength(1);
    expect(result.usage).toMatchObject({
      totalTokens: 780,
      tokenCostUsd: 0.01,
    });
  });

  test("planner repair transport failure retains the rejected first attempt's usage", async () => {
    let calls = 0;
    const model = new MockLanguageModelV4({
      doGenerate: async () => {
        if (calls++ === 0) {
          return textResponse("not-json");
        }
        throw new Error("Repair transport failed");
      },
    });
    models = [model];
    try {
      await geo.generateGeoContentBrief(plannerOptions);
      throw new Error("Expected repair transport failure");
    } catch (error) {
      expect(error).toBeInstanceOf(geo.GeoWriterError);
      expect(
        (error as InstanceType<typeof geo.GeoWriterError>).usage
      ).toMatchObject({
        totalTokens: 780,
        tokenCostUsd: 0.01,
      });
    }
    expect(model.doGenerateCalls).toHaveLength(2);
  });

  test("planner provider refusal is not treated as a JSON repair", async () => {
    const response = textResponse("Blocked by provider");
    response.finishReason = {
      unified: "content-filter",
      raw: "content_filter",
    };
    const model = new MockLanguageModelV4({ doGenerate: response });
    models = [model];
    await expect(
      geo.generateGeoContentBrief(plannerOptions)
    ).rejects.toBeInstanceOf(geo.GeoWriterError);
    expect(model.doGenerateCalls).toHaveLength(1);
  });

  test("planner schema-invalid and truncated output remain repairable", async () => {
    for (const invalid of [
      textResponse(JSON.stringify({ ...brief, sections: [] })),
      textResponse('{"targetPrompt":', "length"),
    ]) {
      const model = new MockLanguageModelV4({
        doGenerate: [invalid, textResponse(JSON.stringify(brief))],
      });
      models = [model];
      const result = await geo.generateGeoContentBrief(plannerOptions);
      expect(result.brief).toMatchObject(brief);
      expect(model.doGenerateCalls).toHaveLength(2);
      expect(result.usage.totalTokens).toBe(1560);
    }
  });

  test("planner non-output failure makes one invocation and preserves the public error type", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: async () => {
        throw new Error("Terminal credentials failure");
      },
    });
    models = [model];
    await expect(
      geo.generateGeoContentBrief(plannerOptions)
    ).rejects.toBeInstanceOf(geo.GeoWriterError);
    expect(model.doGenerateCalls).toHaveLength(1);
  });

  test("planner enrichment failure does not regenerate an already valid brief", async () => {
    enrichmentFails = true;
    const model = new MockLanguageModelV4({
      doGenerate: textResponse(JSON.stringify(brief)),
    });
    models = [model];
    const result = await geo.generateGeoContentBrief(plannerOptions);
    expect(result.brief).toMatchObject(brief);
    expect(model.doGenerateCalls).toHaveLength(1);
    expect(result.usage.totalTokens).toBe(780);
  });

  test("planner exhaustion exposes all failed-attempt usage on GeoWriterError", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: textResponse("not-json"),
    });
    models = [model];
    try {
      await geo.generateGeoContentBrief(plannerOptions);
      throw new Error("Expected planner exhaustion");
    } catch (error) {
      expect(error).toBeInstanceOf(geo.GeoWriterError);
      expect(
        (error as InstanceType<typeof geo.GeoWriterError>).usage?.totalTokens
      ).toBe(1560);
    }
    expect(model.doGenerateCalls).toHaveLength(2);
  });

  test("image timeout cancels before recovery and merges known cost exactly once per turn", async () => {
    const first = imageFixture(new Error("Stream timed out"));
    const recovery = imageFixture();
    const session = image.createAgentSession(first.box);
    await session.run({
      prompt: "Initial",
      timeout: 100,
      label: "initial",
      allowTimeout: true,
    });
    first.events.push("recovery-start");
    first.box.agent.stream = recovery.box.agent.stream;
    await session.run({ prompt: "Recover", timeout: 100, label: "recovery" });
    expect(first.events).toEqual([
      "stream-start",
      "cancel-start",
      "cancel-end",
      "confirm-terminal",
      "recovery-start",
    ]);
    expect(first.stream.cancel).toHaveBeenCalledTimes(1);
    expect(first.reads()).toBe(1);
    expect(recovery.reads()).toBe(1);
    expect(session.usage).toMatchObject({
      inputTokens: 1400,
      outputTokens: 160,
      totalTokens: 1560,
      cacheReadTokens: 160,
      computeMs: 200,
      totalUsd: 0.02,
    });
  });

  test("image ordinary stream errors retain known usage without cancellation", async () => {
    const fixture = imageFixture(new Error("Tool failed"));
    const session = image.createAgentSession(fixture.box);
    await expect(
      session.run({
        prompt: "Initial",
        timeout: 100,
        label: "initial",
        allowTimeout: true,
      })
    ).rejects.toThrow("Tool failed");
    expect(fixture.stream.cancel).not.toHaveBeenCalled();
    expect(fixture.reads()).toBe(1);
    expect(session.usage?.totalTokens).toBe(780);
  });

  test("image non-tolerated timeout cancels and keeps known cost while rethrowing", async () => {
    const fixture = imageFixture(new Error("Stream timed out"));
    const session = image.createAgentSession(fixture.box);
    await expect(
      session.run({ prompt: "Revision", timeout: 100, label: "revision" })
    ).rejects.toThrow("Stream timed out");
    expect(fixture.stream.cancel).toHaveBeenCalledTimes(1);
    expect(fixture.reads()).toBe(1);
    expect(session.usage?.totalTokens).toBe(780);
  });

  test("image cancel rejection fails closed instead of permitting recovery", async () => {
    const fixture = imageFixture(new Error("Stream timed out"));
    fixture.stream.cancel.mockRejectedValueOnce(
      new Error("Cancel unavailable")
    );
    const session = image.createAgentSession(fixture.box);
    await expect(
      session.run({
        prompt: "Initial",
        timeout: 100,
        label: "initial",
        allowTimeout: true,
      })
    ).rejects.toThrow("recovery was not started");
    expect(fixture.reads()).toBe(1);
    expect(session.usage?.totalTokens).toBe(780);
  });

  test("image timeout before reported token usage does not fabricate tokens or dollars", async () => {
    const fixture = imageFixture(
      new Error("Stream timed out"),
      {
        inputTokens: 0,
        outputTokens: 0,
        computeMs: 100,
        totalUsd: 0,
      },
      false
    );
    const session = image.createAgentSession(fixture.box);
    await session.run({
      prompt: "Initial",
      timeout: 100,
      label: "initial",
      allowTimeout: true,
    });
    expect(session.usage).toBeUndefined();
    expect(fixture.reads()).toBe(0);
  });

  test("image unknown timeout does not change prior reported usage", async () => {
    const completed = imageFixture();
    const timeout = imageFixture(
      new Error("Stream timed out"),
      undefined,
      false
    );
    const session = image.createAgentSession(completed.box);
    await session.run({ prompt: "Initial", timeout: 100, label: "initial" });
    completed.box.agent.stream = timeout.box.agent.stream;
    await session.run({
      prompt: "Revision",
      timeout: 100,
      label: "revision",
      allowTimeout: true,
    });
    expect(session.usage).toMatchObject({
      totalTokens: 780,
      totalUsd: 0.01,
      computeMs: 100,
    });
    expect(timeout.reads()).toBe(0);
  });

  test.each(["running", "missing", "unreadable", "different-run"])(
    "image unresolved %s backend state blocks recovery",
    async (outcome) => {
      const fixture = imageFixture(
        new Error("Stream timed out"),
        undefined,
        false
      );
      if (outcome === "unreadable") {
        fixture.listRuns.mockRejectedValueOnce(new Error("Status unavailable"));
      } else {
        fixture.listRuns.mockResolvedValue(
          outcome === "missing"
            ? []
            : [
                {
                  id:
                    outcome === "different-run"
                      ? "another-run"
                      : fixture.stream.id,
                  status: outcome === "running" ? "running" : "completed",
                },
              ]
        );
      }
      const session = image.createAgentSession(fixture.box);
      await expect(
        session.run({
          prompt: "Initial",
          timeout: 100,
          label: "initial",
          allowTimeout: true,
        })
      ).rejects.toMatchObject({ retryable: false });
      expect(fixture.events).not.toContain("recovery-start");
      expect(session.usage).toBeUndefined();
    }
  );

  test("real SDK swallowed cancel HTTP rejection does not permit recovery", async () => {
    const fixture = realSdkFixture("running", 503);
    const session = image.createAgentSession(fixture.box);
    await expect(
      session.run({
        prompt: "Initial",
        timeout: 100,
        label: "initial",
        allowTimeout: true,
      })
    ).rejects.toMatchObject({ retryable: false });
    // This getter lies about backend state even after the rejected request.
    expect(fixture.stream()?.status).toBe("cancelled");
    expect(fixture.stream()?.id).toBe("backend-run");
    expect(fixture.requests).toEqual([
      "POST https://fixture.invalid/v2/box/fixture-box/run/stream",
      "POST https://fixture.invalid/v2/box/fixture-box/runs/backend-run/cancel",
      ...new Array(5).fill(
        "GET https://fixture.invalid/v2/box/fixture-box/runs"
      ),
    ]);
    expect(session.usage).toBeUndefined();
  });

  test("real SDK confirmed completed backend record retains reported cost without a done event", async () => {
    const fixture = realSdkFixture("completed");
    const session = image.createAgentSession(fixture.box);
    await session.run({
      prompt: "Initial",
      timeout: 100,
      label: "initial",
      allowTimeout: true,
    });
    expect(session.usage).toMatchObject({ totalTokens: 780, totalUsd: 0.01 });
  });

  test.each(["missing", "running", "different-run"])(
    "image briefly %s backend record waits for the exact run before recovery",
    async (outcome) => {
      const fixture = imageFixture(
        new Error("Stream timed out"),
        undefined,
        false
      );
      fixture.listRuns.mockResolvedValueOnce(
        outcome === "missing"
          ? []
          : [
              {
                id:
                  outcome === "different-run"
                    ? "another-run"
                    : fixture.stream.id,
                status: outcome === "running" ? "running" : "completed",
              },
            ]
      );
      const session = image.createAgentSession(fixture.box);
      await session.run({
        prompt: "Initial",
        timeout: 100,
        label: "initial",
        allowTimeout: true,
      });
      expect(fixture.listRuns).toHaveBeenCalledTimes(2);
      expect(fixture.box.agent.stream).toHaveBeenCalledTimes(1);
      expect(session.usage).toBeUndefined();
    }
  );

  test.each(["cancelled", "failed"] as const)(
    "real SDK timed-out %s run retains persisted usage without a done event",
    async (status) => {
      const fixture = realSdkFixture(status, 200, true);
      const session = image.createAgentSession(fixture.box);
      await session.run({
        prompt: "Initial",
        timeout: 100,
        label: "initial",
        allowTimeout: true,
      });
      expect(session.usage).toMatchObject({ totalTokens: 780, totalUsd: 0.01 });
      expect(
        fixture.requests.filter((request) => request.endsWith("/run/stream"))
      ).toHaveLength(1);
    }
  );

  test("real SDK failed run with no persisted usage remains unknown", async () => {
    const fixture = realSdkFixture("failed");
    const session = image.createAgentSession(fixture.box);
    await session.run({
      prompt: "Initial",
      timeout: 100,
      label: "initial",
      allowTimeout: true,
    });
    expect(session.usage).toBeUndefined();
  });

  test("real SDK pre-done timeout with rendered output and confirmed cancellation creates no minimum image bill", async () => {
    const fixture = realSdkFixture("cancelled");
    const html = "<html>Rendered fixture</html>";
    fixture.box.exec.command = mock(
      async () =>
        ({ result: "ok" }) as Awaited<
          ReturnType<RepoImageBox["exec"]["command"]>
        >
    );
    fixture.box.files.read = mock(async () => html);
    const result = await marketingFormat.run({
      box: fixture.box,
      input: {
        organizationId: "fixture-org",
        integrationId: "fixture-repo",
        branch: "main",
        mode: "prompt",
        prompt: "Initial",
      },
      repository: { owner: "fixture", repo: "repo" },
      source: { mode: "prompt", prompt: "Initial" },
    });
    expect(result).toEqual({
      html,
      svg: "fixture-svg",
      pngBase64: "fixture-png",
      usage: undefined,
    });
    expect(fixture.stream()?.cost).toMatchObject({
      inputTokens: 0,
      outputTokens: 0,
      totalUsd: 0,
    });
    await trackImageGenerationUsage({
      organizationId: "fixture-org",
      postId: "fixture-post",
      usage: result.usage,
    });
    expect(trackImageUsage).not.toHaveBeenCalled();
    expect(
      fixture.requests.filter((request) => request.endsWith("/run/stream"))
    ).toHaveLength(1);
  });

  // Optional reproducible comparison against actual baseline source, not a
  // reimplementation of its loops. Run with NOTRA_AGENT_COST_BENCH=1.
  if (process.env.NOTRA_AGENT_COST_BENCH === "1") {
    test("baseline/candidate benchmark uses identical fixtures and production source", async () => {
      const baselineCommit = "74c26b09991614b88f8411837936b7af736afabd";
      const root = fileURLToPath(new URL("../../../..", import.meta.url));
      const directory = await mkdtemp(join(tmpdir(), "notra-agent-cost-"));
      try {
        for (const name of [
          "geo-writer",
          "background-gen",
          "repo-image-agent",
        ]) {
          const source = spawnSync(
            "git",
            ["show", `${baselineCommit}:packages/ai/src/agents/${name}.ts`],
            { cwd: root }
          );
          expect(source.status, source.stderr.toString()).toBe(0);
          // Absolute imports keep baseline modules on the same offline mocks.
          const resolved = source.stdout
            .toString()
            .replace(
              /from "([^"]+)"/g,
              (_, specifier: string) =>
                `from ${JSON.stringify(import.meta.resolve(specifier))}`
            );
          await writeFile(join(directory, `${name}.ts`), resolved);
        }
        const baselineGeo = (await import(
          pathToFileURL(join(directory, "geo-writer.ts")).href
        )) as typeof geo;
        const baselineBackground = (await import(
          pathToFileURL(join(directory, "background-gen.ts")).href
        )) as typeof background;
        const baselineImage = (await import(
          pathToFileURL(join(directory, "repo-image-agent.ts")).href
        )) as typeof image;
        const rows = [];
        for (const [label, geoAgent, backgroundAgent, imageAgent] of [
          ["baseline", baselineGeo, baselineBackground, baselineImage],
          ["candidate", geo, background, image],
        ] as const) {
          savedPosts = [];
          const writer = writerModel();
          const humanizer = new MockLanguageModelV4({
            doGenerate: textResponse(draft),
          });
          models = [writer, humanizer];
          const written = await geoAgent.runGeoWriter(writerOptions);
          expect(savedPosts[0]?.markdown).toBe(draft);
          expect(written).toMatchObject({
            postId: "post-1",
            title: brief.workingTitle,
            humanized: true,
          });
          const writerPromptChars = writer.doGenerateCalls.reduce(
            (sum, call) => sum + JSON.stringify(call.prompt).length,
            0
          );

          const planner = new MockLanguageModelV4({
            doGenerate: [
              textResponse("not-json"),
              textResponse(JSON.stringify(brief)),
            ],
          });
          models = [planner];
          const planned =
            await geoAgent.generateGeoContentBrief(plannerOptions);
          expect(planned.brief).toMatchObject(brief);

          const terminal = new MockLanguageModelV4({
            doGenerate: [
              toolResponse("skip", { reason: "No source material" }),
              textResponse("Skipped"),
            ],
          });
          models = [terminal];
          await expect(
            backgroundAgent.runBackgroundGen(backgroundOptions)
          ).rejects.toThrow("No source material");

          const errorModel = new MockLanguageModelV4({
            doGenerate: async () => {
              throw new Error("Terminal credentials failure");
            },
          });
          models = [errorModel];
          await expect(
            geoAgent.generateGeoContentBrief(plannerOptions)
          ).rejects.toThrow("Terminal credentials failure");

          const imageRun = imageFixture(new Error("Stream timed out"));
          const session = imageAgent.createAgentSession(imageRun.box);
          await session.run({
            prompt: "Initial",
            timeout: 100,
            label: "initial",
            allowTimeout: true,
          });
          rows.push({
            label,
            writerCalls: writer.doGenerateCalls.length,
            writerPromptChars,
            humanizerCalls: humanizer.doGenerateCalls.length,
            plannerCalls: planner.doGenerateCalls.length,
            plannerAccountedTokens: planned.usage.totalTokens,
            terminalCalls: terminal.doGenerateCalls.length,
            nonOutputFailureCalls: errorModel.doGenerateCalls.length,
            imageCancels: imageRun.stream.cancel.mock.calls.length,
            imageAccountedTokens: session.usage?.totalTokens ?? 0,
            imageAccountedUsd: session.usage?.totalUsd ?? 0,
          });
        }
        expect(rows[0]).toMatchObject({
          writerCalls: 3,
          humanizerCalls: 1,
          plannerCalls: 2,
          plannerAccountedTokens: 780,
          terminalCalls: 2,
          nonOutputFailureCalls: 2,
          imageCancels: 0,
          imageAccountedTokens: 0,
        });
        expect(rows[1]).toMatchObject({
          writerCalls: 2,
          humanizerCalls: 1,
          plannerCalls: 2,
          plannerAccountedTokens: 1560,
          terminalCalls: 1,
          nonOutputFailureCalls: 1,
          imageCancels: 1,
          imageAccountedTokens: 780,
          imageAccountedUsd: 0.01,
        });
        console.log(
          JSON.stringify(
            { baselineCommit, draftChars: draft.length, rows },
            null,
            2
          )
        );
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    });
  }
}
