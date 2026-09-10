import { expect, test } from "bun:test";

import { parseToolOutputChart } from "./chat-tool-chart";

test("reads only output.chart, not a lookalike payload", () => {
  expect(
    parseToolOutputChart({
      chart: {
        kind: "bar",
        title: "Mention rate",
        segments: [{ label: "Search", value: 40 }],
      },
    })?.kind
  ).toBe("bar");

  expect(
    parseToolOutputChart({
      kind: "bar",
      title: "Mention rate",
      segments: [{ label: "Search", value: 40 }],
    })
  ).toBeUndefined();
});
