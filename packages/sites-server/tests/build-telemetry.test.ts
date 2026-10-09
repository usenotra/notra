import { expect, test } from "bun:test";

import { SITE_BUILD_LIMITS } from "@notra/sites-core/constants/sites";

import { boundBuildLog } from "../src/utils/bound-build-log";

test("build log retains phase headers and newest output within the byte limit", () => {
  const header =
    "[deployment:preparing] 2026-10-08T10:00:00.000Z\n" +
    "[deployment:building] 2026-10-08T10:00:01.000Z\n" +
    "[deployment:deploying] 2026-10-08T10:00:02.000Z\n";
  const log = boundBuildLog(
    `${header}old output\n${"😀".repeat(SITE_BUILD_LIMITS.maxBuildLogBytes)}done`
  );
  expect(log).toStartWith(header);
  expect(log).toEndWith("😀done");
  expect(log).not.toContain("old output");
  expect(log).not.toContain("\ufffd");
  expect(Buffer.byteLength(log)).toBeLessThanOrEqual(
    SITE_BUILD_LIMITS.maxBuildLogBytes
  );
});

test("short logs are unchanged and headerless logs keep a valid UTF-8 tail", () => {
  expect(boundBuildLog("short 😀 log")).toBe("short 😀 log");
  expect(boundBuildLog("")).toBe("");
  const log = boundBuildLog("€".repeat(SITE_BUILD_LIMITS.maxBuildLogBytes));
  expect(log).not.toContain("\ufffd");
  expect(Buffer.byteLength(log)).toBeLessThanOrEqual(
    SITE_BUILD_LIMITS.maxBuildLogBytes
  );
});

test("an oversized phase header cannot bypass the byte cap", () => {
  const log = boundBuildLog(
    `[deployment:building] ${"😀".repeat(SITE_BUILD_LIMITS.maxBuildLogBytes)}\noutput`
  );
  expect(log).toStartWith("[deployment:building] ");
  expect(log).not.toContain("\ufffd");
  expect(Buffer.byteLength(log)).toBeLessThanOrEqual(
    SITE_BUILD_LIMITS.maxBuildLogBytes
  );
});
