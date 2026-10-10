import { spawnSync } from "node:child_process";

export function runDocker(args, timeout = 10_000, spawn = spawnSync) {
  const result = spawn("docker", args, { encoding: "utf8", timeout });
  if (result.error || result.status !== 0) {
    throw Object.assign(
      new Error(
        `Docker ${args[0]} failed: ${result.error?.message || result.stderr || result.signal || result.status}`
      ),
      { exitCode: result.status || 1 }
    );
  }
  return result.stdout;
}
