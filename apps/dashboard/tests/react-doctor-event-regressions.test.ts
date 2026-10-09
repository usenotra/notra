import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  reactDoctorEventCases,
  reactDoctorEventWorker,
} from "./constants/react-doctor-events";

for (const [file, component, mode] of reactDoctorEventCases) {
  test(`${component} preserves event and error invariants`, () => {
    const result = spawnSync(
      process.execPath,
      ["--eval", reactDoctorEventWorker, file, component, mode],
      {
        cwd: fileURLToPath(new URL("..", import.meta.url)),
        timeout: 30_000,
        encoding: "utf8",
      }
    );
    expect(result.status, result.stdout + result.stderr).toBe(0);
  });
}
