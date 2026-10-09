import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { GUEST_BUILD_RUNNER } from "../src/constants/build-runner";
import { guestBuildTelemetrySchema } from "../src/schemas/build-telemetry";
import { shellQuote } from "../src/utils/shell";

test("native guest wrapper measures extraction, compilation and packing and persists failure telemetry", async () => {
  const root = await mkdtemp(join(tmpdir(), "notra-guest-build-"));
  try {
    await mkdir(join(root, "bundle", "folder with spaces"), {
      recursive: true,
    });
    await writeFile(
      join(root, "bundle", "folder with spaces", "input.txt"),
      "site source"
    );
    await mkdir(join(root, "toolchain", "dist"), { recursive: true });
    await writeFile(
      join(root, "toolchain", "dist", "cli.mjs"),
      `
      import fs from 'node:fs';
      const source = process.argv[process.argv.indexOf('--source') + 1];
      const content = fs.readFileSync(source + '/input.txt', 'utf8');
      console.log('compiler saw ' + content);
      fs.mkdirSync('../out', { recursive: true });
      fs.writeFileSync('../out/index.html', content);
      fs.writeFileSync('../result.json', JSON.stringify({ ok: true }));
    `
    );
    expect(
      spawnSync("tar", ["czf", "source.tgz", "bundle"], { cwd: root }).status
    ).toBe(0);
    await mkdir(join(root, "src"));
    const script = `node -e ${shellQuote(GUEST_BUILD_RUNNER)} -- ${shellQuote("../src/folder with spaces")} 10`;
    const success = spawnSync("sh", ["-c", script], {
      cwd: root,
      encoding: "utf8",
    });
    expect(success.status).toBe(0);
    expect(await readFile(join(root, "build.log"), "utf8")).toContain(
      "compiler saw site source"
    );
    expect(await readFile(join(root, "exit-code"), "utf8")).toBe("0");
    const telemetry = guestBuildTelemetrySchema.parse(
      JSON.parse(await readFile(join(root, "build-metrics.json"), "utf8"))
    );
    expect(telemetry.phases.extract).toBeGreaterThan(0);
    expect(telemetry.phases.compile).toBeGreaterThan(0);
    expect(telemetry.phases.pack).toBeGreaterThan(0);
    expect((await readFile(join(root, "out.tgz"))).byteLength).toBeGreaterThan(
      0
    );

    await rm(join(root, "out"), { recursive: true });
    await writeFile(join(root, "source.tgz"), "invalid archive");
    const failure = spawnSync("sh", ["-c", script], {
      cwd: root,
      encoding: "utf8",
    });
    expect(failure.status).toBe(3);
    expect(await readFile(join(root, "exit-code"), "utf8")).toBe("3");
    const failedTelemetry = guestBuildTelemetrySchema.parse(
      JSON.parse(await readFile(join(root, "build-metrics.json"), "utf8"))
    );
    expect(failedTelemetry.phases.extract).toBeGreaterThan(0);
    expect(failedTelemetry.phases.compile).toBeUndefined();
    expect(failedTelemetry.phases.pack).toBeUndefined();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("native guest packing failure reports a nonzero exit even after a successful compiler result", async () => {
  const root = await mkdtemp(join(tmpdir(), "notra-guest-pack-failure-"));
  try {
    await mkdir(join(root, "bundle"));
    await writeFile(join(root, "bundle", "input.txt"), "site source");
    await mkdir(join(root, "toolchain", "dist"), { recursive: true });
    await writeFile(
      join(root, "toolchain", "dist", "cli.mjs"),
      `
      import fs from 'node:fs';
      fs.mkdirSync('../out');
      fs.writeFileSync('../out/index.html', 'compiled output');
      fs.writeFileSync('../result.json', JSON.stringify({ ok: true }));
    `
    );
    expect(
      spawnSync("tar", ["czf", "source.tgz", "bundle"], { cwd: root }).status
    ).toBe(0);
    await mkdir(join(root, "src"));
    await mkdir(join(root, "out.tgz"));
    const script = `node -e ${shellQuote(GUEST_BUILD_RUNNER)} -- ${shellQuote("../src")} 10`;
    const run = spawnSync("sh", ["-c", script], {
      cwd: root,
      encoding: "utf8",
    });
    expect(run.status).toBe(3);
    expect(
      JSON.parse(await readFile(join(root, "result.json"), "utf8"))
    ).toEqual({ ok: true });
    expect(await readFile(join(root, "exit-code"), "utf8")).toBe("3");
    expect(await readFile(join(root, "build.log"), "utf8")).toContain(
      "Packing build output failed"
    );
    const telemetry = guestBuildTelemetrySchema.parse(
      JSON.parse(await readFile(join(root, "build-metrics.json"), "utf8"))
    );
    expect(telemetry.phases.compile).toBeGreaterThan(0);
    expect(telemetry.phases.pack).toBeGreaterThan(0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
