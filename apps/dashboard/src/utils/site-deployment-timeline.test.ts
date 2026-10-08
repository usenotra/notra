import { expect, test } from "bun:test";

import type { SiteDeploymentTimelineRecord } from "@/types/site-deployment-timeline";
import {
  deploymentTimelinePhases,
  formatDeploymentPhaseDuration,
} from "@/utils/site-deployment-timeline";

const start = Date.parse("2026-10-07T12:00:00.000Z");
const deployment: SiteDeploymentTimelineRecord = {
  status: "building",
  createdAt: new Date(start),
  startedAt: new Date(start + 2000),
  finishedAt: null,
};
const marker = (phase: string, elapsed: number) =>
  `[deployment:${phase}] ${new Date(start + elapsed).toISOString()}`;
const preparing = marker("preparing", 2000);
const building = `${preparing}\n${marker("building", 5000)}`;
const deploying = `${building}\n${marker("deploying", 15_000)}`;

test("active phase grows while completed timings remain frozen", () => {
  const early = deploymentTimelinePhases(deployment, building, start + 8000);
  const late = deploymentTimelinePhases(deployment, building, start + 12_000);
  expect(early.map((phase) => phase.durationMs)).toEqual([
    2000,
    3000,
    3000,
    null,
  ]);
  expect(late.map((phase) => phase.durationMs)).toEqual([
    2000,
    3000,
    7000,
    null,
  ]);
  expect(late.map((phase) => phase.state)).toEqual([
    "complete",
    "complete",
    "active",
    "pending",
  ]);
});

test("deployment transition completes building and starts measured deployment", () => {
  const phases = deploymentTimelinePhases(
    { ...deployment, status: "uploading" },
    deploying,
    start + 17_000
  );
  expect(phases.map((phase) => phase.durationMs)).toEqual([
    2000, 3000, 10_000, 2000,
  ]);
  expect(phases.map((phase) => phase.state)).toEqual([
    "complete",
    "complete",
    "complete",
    "active",
  ]);
});

test("ready and expired deployments stop at the recorded finish time", () => {
  for (const status of ["ready", "expired"] as const) {
    const phases = deploymentTimelinePhases(
      { ...deployment, status, finishedAt: new Date(start + 18_000) },
      deploying,
      start + 90_000
    );
    expect(phases.map((phase) => phase.durationMs)).toEqual([
      2000, 3000, 10_000, 3000,
    ]);
    expect(phases.every((phase) => phase.state === "complete")).toBe(true);
  }
});

test("failure and cancellation stop only the entered phase", () => {
  for (const [status, state] of [
    ["failed", "failed"],
    ["canceled", "stopped"],
    ["superseded", "stopped"],
  ] as const) {
    const phases = deploymentTimelinePhases(
      { ...deployment, status, finishedAt: new Date(start + 9000) },
      building,
      start + 90_000
    );
    expect(phases[2]).toMatchObject({ state, durationMs: 4000 });
    expect(phases[3]).toMatchObject({ state: "pending", durationMs: null });
  }
});

test("queued and historical deployments never invent missing phase timings", () => {
  const queued = deploymentTimelinePhases(
    { ...deployment, status: "queued", startedAt: null },
    null,
    start + 4000
  );
  expect(queued.map((phase) => phase.state)).toEqual([
    "active",
    "pending",
    "pending",
    "pending",
  ]);
  const old = deploymentTimelinePhases(
    { ...deployment, status: "ready", finishedAt: new Date(start + 18_000) },
    "12:00:05 [build] compiling",
    start + 90_000
  );
  expect(old.map((phase) => phase.id)).toEqual(["queued", "execution"]);
  expect(old.map((phase) => phase.durationMs)).toEqual([2000, 16_000]);
});

test("invalid, duplicate, reversed and out-of-bounds markers are ignored", () => {
  const log = [
    marker("building", 3000),
    marker("preparing", 1000),
    preparing,
    "[deployment:building] not-a-date",
    marker("building", 1000),
    marker("building", 5000),
    marker("building", 6000),
    marker("deploying", 99_000),
  ].join("\n");
  const phases = deploymentTimelinePhases(
    { ...deployment, status: "failed", finishedAt: new Date(start + 9000) },
    log,
    start + 90_000
  );
  expect(phases.map((phase) => phase.durationMs)).toEqual([
    2000,
    3000,
    4000,
    null,
  ]);
});

test("terminal timestamps are never replaced with a live clock", () => {
  const phases = deploymentTimelinePhases(
    { ...deployment, status: "failed" },
    building,
    start + 90_000
  );
  expect(phases[2]).toMatchObject({ state: "failed", durationMs: null });
});

test("missing deployment telemetry never extends the previous phase", () => {
  const uploading = deploymentTimelinePhases(
    { ...deployment, status: "uploading" },
    building,
    start + 30_000
  );
  expect(uploading[2]).toMatchObject({ state: "complete", durationMs: null });
  expect(uploading[3]).toMatchObject({ state: "active", durationMs: null });
  const ready = deploymentTimelinePhases(
    { ...deployment, status: "ready", finishedAt: new Date(start + 18_000) },
    building,
    start + 90_000
  );
  expect(ready[2]).toMatchObject({ state: "complete", durationMs: null });
  expect(ready[3]).toMatchObject({ state: "unknown", durationMs: null });
});

test("future server timestamps cannot produce negative running durations", () => {
  expect(
    deploymentTimelinePhases(deployment, building, start + 4000)[2]?.durationMs
  ).toBe(0);
});

test("subsecond phases preserve their actual duration", () => {
  expect(formatDeploymentPhaseDuration(650, "en")).toBe("650ms");
  expect(formatDeploymentPhaseDuration(0, "en")).toBe("0ms");
  expect(formatDeploymentPhaseDuration(12_000, "en")).toBe("12s");
  expect(formatDeploymentPhaseDuration(null, "en")).toBeNull();
});

test("builder output cannot masquerade as deployment phase metadata", () => {
  const phases = deploymentTimelinePhases(
    deployment,
    `12:00:00 [build] compiling\n${building}`,
    start + 9000
  );
  expect(phases.map((phase) => phase.id)).toEqual(["queued", "execution"]);
});
