/**
 * Bakes the build toolchain into an Upstash Box snapshot. Builds restore from
 * it with networking disabled, so everything (Astro, React, Tailwind) must be
 * installed here.
 *
 *   bun --env-file=../../.env scripts/create-box-snapshot.ts [--write-env ../../.env]
 *
 * Prints SITES_BUILDER_SNAPSHOT_ID; with --write-env it updates that file.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";

import { Box } from "@upstash/box";

const ROOT = resolve(import.meta.dir, "..");
const WORKDIR = "/workspace/home";
const { values } = parseArgs({ options: { "write-env": { type: "string" } } });

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}

execFileSync("bun", ["run", "bundle"], { cwd: ROOT, stdio: "inherit" });

const stage = mkdtempSync(join(tmpdir(), "notra-sites-toolchain-"));
for (const entry of ["astro.config.mjs", "src", "dist"]) {
  cpSync(join(ROOT, entry), join(stage, entry), { recursive: true });
}
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
  dependencies: Record<string, string>;
};
writeFileSync(
  join(stage, "package.json"),
  `${JSON.stringify({ name: "notra-sites-toolchain", private: true, type: "module", dependencies: pkg.dependencies }, null, 2)}\n`
);
const hash = createHash("sha256");
for (const file of listFiles(stage).sort()) {
  hash.update(relative(stage, file));
  hash.update(readFileSync(file));
}
const version = hash.digest("hex").slice(0, 12);
writeFileSync(join(stage, "VERSION"), `${version}\n`);
const archive = join(stage, "..", `toolchain-${version}.tgz`);
execFileSync("tar", ["--no-xattrs", "-czf", archive, "-C", stage, "."], {
  env: { ...process.env, COPYFILE_DISABLE: "1" },
});
console.log(`toolchain ${version}`);

const box = await Box.create({
  runtime: "node",
  size: "medium",
  networkPolicy: { mode: "allow-all" },
  timeout: 600_000,
});
try {
  await box.files.upload([
    { path: archive, destination: `${WORKDIR}/toolchain.tgz` },
  ]);
  await box.exec.command(
    [
      `cd ${WORKDIR}`,
      "rm -rf toolchain && mkdir toolchain",
      "tar xzf toolchain.tgz -C toolchain && rm toolchain.tgz",
      "cd toolchain",
      "npm install --omit=dev --no-audit --no-fund --loglevel=error > npm.log 2>&1",
    ].join(" && ")
  );
  // exec output is unreliable when the command writes to stderr, so check files instead.
  const installedVersion = (
    await box.files.read(`${WORKDIR}/toolchain/VERSION`)
  ).trim();
  const astro = await box.files
    .read(`${WORKDIR}/toolchain/node_modules/astro/package.json`)
    .catch(() => null);
  if (installedVersion !== version || !astro) {
    const log = await box.files
      .read(`${WORKDIR}/toolchain/npm.log`)
      .catch(() => "");
    throw new Error(`Toolchain install failed:\n${log}`);
  }
  const snapshot = await box.snapshot({
    name: `notra-sites-toolchain-${version}`,
  });
  console.log(`SITES_BUILDER_SNAPSHOT_ID=${snapshot.id}`);
  if (values["write-env"]) {
    const envPath = resolve(values["write-env"]);
    const text = readFileSync(envPath, "utf8");
    const line = `SITES_BUILDER_SNAPSHOT_ID=${snapshot.id}`;
    writeFileSync(
      envPath,
      /^SITES_BUILDER_SNAPSHOT_ID=.*$/m.test(text)
        ? text.replace(/^SITES_BUILDER_SNAPSHOT_ID=.*$/m, line)
        : `${text.trimEnd()}\n${line}\n`
    );
    console.log(`updated ${envPath}`);
  }
} finally {
  await box.delete().catch(() => undefined);
  rmSync(stage, { recursive: true, force: true });
  rmSync(archive, { force: true });
}
