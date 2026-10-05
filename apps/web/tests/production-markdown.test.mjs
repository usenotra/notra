import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

test("production markdown endpoints work without the source tree", async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), "notra-web-markdown-"));
  try {
    await cp(new URL("../.output/", import.meta.url), cwd, {
      recursive: true,
      dereference: true,
    });
  } catch (error) {
    await rm(cwd, { recursive: true, force: true });
    throw error;
  }
  const child = spawn(process.execPath, [join(cwd, "server/index.mjs")], {
    cwd,
    env: {
      PATH: process.env.PATH,
      NODE_ENV: "production",
      NITRO_PORT: "0",
      NITRO_HOST: "127.0.0.1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, "exit");
      child.kill("SIGTERM");
      await exited;
    }
    await rm(cwd, { recursive: true, force: true });
  });

  const url = await new Promise((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(() => reject(new Error(output)), 30_000);
    const collect = (chunk) => {
      output += chunk.toString();
      const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) {
        clearTimeout(timeout);
        resolve(match[0]);
      }
    };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("exit", () => {
      clearTimeout(timeout);
      reject(new Error(`Production server exited: ${output}`));
    });
  });

  const full = await fetch(`${url}/llms-full.txt`);
  assert.equal(full.status, 200);
  assert.match(full.headers.get("content-type"), /text\/plain/);
  const text = await full.text();
  assert.match(text, /## Blog\n/);
  assert.match(text, /## Notra Changelog\n/);
  assert.match(text, /## Example Company Changelogs\n/);
  assert.match(text, /### React Ink now gets ErrorPrimitive/);
  assert.ok(!text.includes("\n---\ntitle:"));

  const markdown = await fetch(
    `${url}/changelog/assistant-ui/react-ink-react-native-and-template-reliability.md`
  );
  assert.equal(markdown.status, 200);
  assert.match(markdown.headers.get("content-type"), /text\/markdown/);
  assert.match(await markdown.text(), /### React Ink now gets ErrorPrimitive/);

  for (const path of ["/privacy.md", "/features/personas.md", "/llms.txt"]) {
    const response = await fetch(`${url}${path}`);
    assert.equal(response.status, 200, path);
    assert.ok((await response.text()).startsWith("# "), path);
  }

  const missing = await fetch(`${url}/changelog/assistant-ui/missing-entry.md`);
  assert.equal(missing.status, 404);
});
