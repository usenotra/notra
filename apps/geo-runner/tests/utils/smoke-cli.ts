export async function runSmokeCli(
  args: string[],
  env: Record<string, string | undefined> = {}
) {
  const process = Bun.spawn(
    [Bun.which("bun") ?? "bun", "scripts/smoke.ts", ...args],
    {
      cwd: new URL("../..", import.meta.url).pathname,
      env: {
        PATH: Bun.env.PATH ?? "",
        NODE_ENV: "test",
        GEO_RUNNER_SECRET: "test-cli-secret-at-least-32-characters",
        ...env,
      },
      stdout: "pipe",
      stderr: "pipe",
    }
  );
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);
  return { stdout, stderr, exitCode };
}
