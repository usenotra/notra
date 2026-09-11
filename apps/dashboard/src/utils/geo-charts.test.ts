import { describe, expect, test } from "bun:test";

import { chartKey } from "./chart-keys";
import { buildMentionTrendRows } from "./geo-charts";

describe("buildMentionTrendRows", () => {
  test("groups model variants into provider families", () => {
    const { engines, rows } = buildMentionTrendRows([
      {
        day: "2026-09-09",
        engine: "openai/gpt-5.6-luna",
        checks: 4,
        mentions: 2,
      },
      {
        day: "2026-09-09",
        engine: "openai/gpt-5.6-sol",
        checks: 4,
        mentions: 1,
      },
      {
        day: "2026-09-09",
        engine: "anthropic/claude-opus-5",
        checks: 4,
        mentions: 1,
      },
      {
        day: "2026-09-09",
        engine: "xai/grok-4.6",
        checks: 4,
        mentions: 0,
      },
    ]);

    expect(engines).toEqual(["openai", "claude", "grok"]);
    const row = rows.find((entry) => entry.rawDay === "2026-09-09");
    expect(row?.[chartKey("openai")]).toBe(3);
    expect(row?.[chartKey("claude")]).toBe(1);
    expect(row?.[chartKey("grok")]).toBe(0);
  });

  test("ranks families by mentions in the usage window", () => {
    const { engines } = buildMentionTrendRows([
      {
        day: "2026-09-08",
        engine: "google/gemini-3.5-flash",
        checks: 2,
        mentions: 5,
      },
      {
        day: "2026-09-09",
        engine: "moonshot/kimi-k2.7",
        checks: 2,
        mentions: 8,
      },
    ]);

    expect(engines[0]).toBe("kimi");
    expect(engines[1]).toBe("gemini");
  });
});
