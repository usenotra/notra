import { expect, test } from "bun:test";

import { parseBuildLog } from "@/utils/site-build-log";

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
