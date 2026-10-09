import { expect, test } from "bun:test";

import { countLogLines, parseBuildLog } from "@/utils/site-build-log";

test("phase telemetry stays out of displayed build output", () => {
  const lines = parseBuildLog(
    [
      "[deployment:preparing] 2026-10-07T12:00:00.000Z",
      "[deployment:building] 2026-10-07T12:00:03.000Z",
      "12:00:05 [build] Rendering pages",
      "12:00:06 [warn] Example warning",
    ].join("\n")
  );
  expect(lines.map((line) => line.text)).toEqual([
    "[build] Rendering pages",
    "[warn] Example warning",
  ]);
  expect(lines[1]?.tone).toBe("warning");
  expect(lines[0]?.number).toBe(3);
});

test("phase-only logs preserve the waiting-for-output state", () => {
  expect(
    parseBuildLog("[deployment:preparing] 2026-10-07T12:00:00.000Z\n")
  ).toEqual([]);
});

test("similar text inside actual builder output is not deleted", () => {
  const lines = parseBuildLog(
    "12:00:05 [build] started\n[deployment:building] 2026-10-07T12:00:03.000Z"
  );
  expect(lines).toHaveLength(2);
  expect(lines[1]?.text).toContain("[deployment:building]");
});

test("multiplication signs in ordinary output do not count as errors", () => {
  const lines = parseBuildLog(
    "Generated image: 1200 × 630\n12:00:05 [build] Rendered image: 800 × 600"
  );
  expect(lines.map((line) => line.tone)).toEqual(["default", "default"]);
  expect(countLogLines(lines, "error")).toBe(0);
});

test.each([
  "× blog/example.mdx",
  "  × blog/example.mdx",
  "12:00:05 × blog/example.mdx",
])("a leading failure marker remains an error: %s", (log) => {
  const lines = parseBuildLog(log);
  expect(lines[0]?.tone).toBe("error");
  expect(countLogLines(lines, "error")).toBe(1);
});
