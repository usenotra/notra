import { describe, expect, mock, test } from "bun:test";

import {
  convertToModelMessages,
  generateText,
  isStepCount,
  type UIMessage,
} from "ai";
import { MockLanguageModelV4 } from "ai/test";

import { geoToolModelOutput } from "./geo-tool-model-output";

const overview = {
  project_id: "project-test",
  days: 30,
  engines: [
    {
      engine: "test-engine",
      checks: 10,
      mentions: 3,
      mention_rate: 0.3,
      avg_position: 2,
    },
  ],
  competitor_share: [{ brand: "Other", mentions: 4 }],
  chart: {
    kind: "bar",
    title: "Visibility",
    subtitle: "Last 30 days",
    segments: [{ label: "test-engine", value: 30 }],
  },
};
const timeseries = {
  project_id: "project-test",
  days: 30,
  points: [
    {
      day: "2026-10-01",
      engine: "test-engine",
      checks: 10,
      mentions: 3,
      mention_rate: 0.3,
      avg_position: 2,
    },
  ],
  chart: {
    kind: "area",
    title: "Visibility over time",
    subtitle: "Last 30 days",
    series: [{ name: "test-engine", points: [{ x: "2026-10-01", y: 30 }] }],
  },
};
const competitors = {
  project_id: "project-test",
  days: 30,
  competitors: [{ brand: "Other", mentions: 4 }],
  chart: {
    kind: "pie",
    title: "Competitors",
    subtitle: "Last 30 days",
    segments: [{ label: "Other", value: 4 }],
  },
};

mock.module("@notra/ai/utils/geo-tool-data", () => ({
  loadGeoOverviewForTool: async () => overview,
  loadGeoTimeseriesForTool: async () => timeseries,
  loadGeoCompetitorShareForTool: async () => competitors,
  loadGeoProjectsForTool: async () => ({ projects: [], count: 0 }),
  loadGeoPromptResultsForTool: async () => ({ results: [] }),
  loadGeoProjectContextForTool: async () => ({}),
}));

const {
  createGetGeoOverviewTool,
  createGetGeoTimeseriesTool,
  createGetGeoCompetitorShareTool,
} = await import("../tools/geo");

describe("GEO model context projection", () => {
  test("the live SDK loop sends only metrics to the next step while retaining the full UI result", async () => {
    let calls = 0;
    const model = new MockLanguageModelV4({
      doGenerate: async () => {
        const first = calls++ === 0;
        return {
          content: first
            ? [
                {
                  type: "tool-call" as const,
                  toolCallId: "geo-loop",
                  toolName: "getGeoTimeseries",
                  input: JSON.stringify({ days: 30 }),
                },
              ]
            : [{ type: "text" as const, text: "Visibility is 30%." }],
          finishReason: {
            unified: first ? ("tool-calls" as const) : ("stop" as const),
            raw: "stop",
          },
          usage: {
            inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 1, text: 1, reasoning: 0 },
          },
          warnings: [],
        };
      },
    });
    const result = await generateText({
      model,
      tools: {
        getGeoTimeseries: createGetGeoTimeseriesTool({
          organizationId: "org-test",
        }),
      },
      prompt: "Show GEO visibility trends",
      stopWhen: isStepCount(2),
    });
    expect(calls).toBe(2);
    expect(result.steps[0]?.toolResults[0]?.output).toEqual(timeseries);
    const toolMessage = model.doGenerateCalls[1]?.prompt.find(
      (message) => message.role === "tool"
    );
    if (!toolMessage || toolMessage.role !== "tool") {
      throw new Error("Missing model tool result");
    }
    expect(toolMessage.content[0]).toMatchObject({
      output: geoToolModelOutput(timeseries),
    });
  });
  test.each([
    {
      name: "getGeoOverview",
      create: createGetGeoOverviewTool,
      output: overview,
    },
    {
      name: "getGeoTimeseries",
      create: createGetGeoTimeseriesTool,
      output: timeseries,
    },
    {
      name: "getGeoCompetitorShare",
      create: createGetGeoCompetitorShareTool,
      output: competitors,
    },
  ])(
    "$name preserves every metric and keeps charts available to the UI",
    async ({ name, create, output }) => {
      const tool = create({ organizationId: "org-test" });
      if (!tool.execute || !tool.toModelOutput) {
        throw new Error("Missing GEO execution or projection");
      }
      const original = structuredClone(output);
      const input = { days: 30, limit: 10 };
      const full = await tool.execute(input, {
        toolCallId: "geo-test",
        messages: [],
        context: {},
      });
      expect(full).toEqual(original);
      const projected = await tool.toModelOutput({
        toolCallId: "geo-test",
        input,
        output: full,
      });
      const expected = structuredClone(output);
      Reflect.deleteProperty(expected, "chart");
      if (projected.type !== "text") {
        throw new Error("Missing text model projection");
      }
      const restored = JSON.parse(projected.value);
      if (name === "getGeoTimeseries") {
        expect(restored.points.columns).toEqual(
          Object.keys(timeseries.points[0] ?? {})
        );
        const { columns, rows } = restored.points;
        restored.points = rows.map((row: unknown[]) =>
          Object.fromEntries(
            columns.map((column: string, index: number) => [column, row[index]])
          )
        );
      }
      expect(restored).toEqual(expected);
      expect(full).toEqual(original);

      const messages: UIMessage[] = [
        {
          id: "assistant-test",
          role: "assistant",
          parts: [
            {
              type: `tool-${name}`,
              toolCallId: "geo-test",
              state: "output-available",
              input,
              output: full,
            },
          ],
        },
      ];
      const history = await convertToModelMessages(messages, {
        tools: { [name]: tool },
      });
      const toolMessage = history.find((message) => message.role === "tool");
      if (!toolMessage || toolMessage.role !== "tool") {
        throw new Error("Missing tool history message");
      }
      expect(toolMessage.content[0]).toMatchObject({
        type: "tool-result",
        toolName: name,
        output: projected,
      });
      expect(messages[0]?.parts[0]).toMatchObject({ output: original });
    }
  );

  test.each([
    null,
    undefined,
    "GEO unavailable",
    { isError: true, error: "Query failed", retryable: false },
    [{ engine: "example", mentions: 2 }],
  ])("preserves non-chart outputs and errors", (output) => {
    expect(geoToolModelOutput(output)).toEqual({
      type: "text",
      value: JSON.stringify(output) ?? "null",
    });
  });

  test("columnar points preserve nulls, numeric precision and differing key order", () => {
    const output = {
      days: 2,
      points: [
        { day: "2026-10-01", rate: 0.123456789, position: null },
        { position: 2, rate: 0.987654321, day: "2026-10-02" },
      ],
      chart: { kind: "area" },
    };
    expect(JSON.parse(geoToolModelOutput(output).value)).toEqual({
      days: 2,
      points: {
        columns: ["day", "rate", "position"],
        rows: [
          ["2026-10-01", 0.123456789, null],
          ["2026-10-02", 0.987654321, 2],
        ],
      },
    });
    expect(output.points[0]?.rate).toBe(0.123456789);
  });

  test.each([
    { points: [] },
    { points: [{ day: "first" }, { day: "second", extra: 1 }] },
    { points: [null] },
    { points: [{ day: undefined, rate: 1 }] },
  ])(
    "nonuniform or empty point payloads retain their original shape",
    ({ points }) => {
      expect(geoToolModelOutput({ points, chart: {} }).value).toBe(
        JSON.stringify({ points })
      );
    }
  );
});
