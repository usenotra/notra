export async function startService(
  env: Record<string, string> = {},
  entrypoint = "dist/index.js"
) {
  const child = Bun.spawn([process.execPath, entrypoint], {
    cwd: new URL("../../", import.meta.url).pathname,
    env: { PATH: process.env.PATH, NODE_ENV: "production", PORT: "0", ...env },
    stdout: "pipe",
    stderr: "inherit",
  });
  const reader = child.stdout.getReader();
  const decoder = new TextDecoder();
  let output = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      throw new Error(`Ingest service exited before listening: ${output}`);
    }
    output += decoder.decode(value, { stream: true });
    const match = output.match(/Listening on port (\d+)/);
    if (match) {
      reader.releaseLock();
      return {
        url: `http://127.0.0.1:${match[1]}`,
        child,
        async stop() {
          child.kill("SIGTERM");
          return await child.exited;
        },
      };
    }
  }
}
