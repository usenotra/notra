import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { test } from "node:test";

test("production responses isolate cache variants and journey links", async (t) => {
  const child = spawn(process.execPath, [".output/server/index.mjs"], {
    cwd: new URL("../", import.meta.url),
    env: {
      PATH: process.env.PATH,
      NODE_ENV: "production",
      NITRO_PORT: "0",
      NITRO_HOST: "127.0.0.1",
      NOTRA_CONSOLE_URL: "http://127.0.0.1:9",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, "exit");
      child.kill("SIGTERM");
      await exited;
    }
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

  await t.test(
    "live integration catalog and fallback HTML are not cached",
    async () => {
      for (const path of ["/integrations", "/integrations/brew"]) {
        const response = await fetch(`${url}${path}`);
        assert.equal(response.status, 200, path);
        assert.match(response.headers.get("content-type"), /text\/html/);
        assert.match(response.headers.get("cache-control"), /private/);
        assert.match(response.headers.get("cache-control"), /no-store/);
        assert.ok((await response.text()).includes("Brew"));
      }
    }
  );

  await t.test(
    "live integration Markdown aliases and fallback responses are not cached",
    async () => {
      for (const path of [
        "/integrations.md",
        "/integrations/brew.md",
        "/md/integrations",
        "/md/integrations/brew",
        "/integrations",
        "/integrations/brew",
      ]) {
        const response = await fetch(`${url}${path}`, {
          headers: { "User-Agent": "Mozilla/5.0", Accept: "text/markdown" },
        });
        assert.equal(response.status, 200, path);
        assert.match(response.headers.get("content-type"), /text\/markdown/);
        assert.match(response.headers.get("cache-control"), /private/);
        assert.match(response.headers.get("cache-control"), /no-store/);
        assert.ok((await response.text()).includes("Brew"));
      }
      const slack = await fetch(`${url}/integrations/slack.md`);
      assert.equal(slack.status, 200);
      assert.match(slack.headers.get("content-type"), /text\/markdown/);
      assert.equal(slack.headers.get("cache-control"), "public, max-age=300");
      await slack.text();
    }
  );

  await t.test(
    "HTML, Markdown and rejected Accept headers vary by negotiation inputs",
    async () => {
      for (const [userAgent, accept, status, contentType] of [
        ["Mozilla/5.0", "text/html", 200, "text/html"],
        ["GPTBot/1.0", "text/html", 200, "text/markdown"],
        ["Mozilla/5.0", "text/markdown", 200, "text/markdown"],
        ["Mozilla/5.0", "application/json", 406, "text/plain"],
      ]) {
        const response = await fetch(`${url}/privacy`, {
          headers: { "User-Agent": userAgent, Accept: accept },
        });
        assert.equal(response.status, status);
        assert.ok(response.headers.get("content-type").startsWith(contentType));
        const vary = response.headers
          .get("vary")
          .toLowerCase()
          .split(",")
          .map((token) => token.trim());
        assert.ok(vary.includes("accept"));
        assert.ok(vary.includes("user-agent"));
        assert.equal(new Set(vary).size, vary.length);
        await response.text();
      }
    }
  );

  await t.test(
    "public HTML has a bounded CDN cache and direct Markdown stays cacheable",
    async () => {
      const html = await fetch(`${url}/privacy`);
      assert.equal(html.status, 200);
      assert.equal(
        html.headers.get("cache-control"),
        "public, max-age=0, s-maxage=300, stale-while-revalidate=60"
      );
      await html.text();
      const markdown = await fetch(`${url}/privacy.md`);
      assert.equal(markdown.status, 200);
      assert.equal(
        markdown.headers.get("cache-control"),
        "public, max-age=300"
      );
      await markdown.text();
    }
  );

  await t.test(
    "individually tagged HTML and Markdown are never shared-cacheable",
    async () => {
      const journeys = [];
      for (let i = 0; i < 2; i += 1) {
        const response = await fetch(`${url}/privacy`, {
          headers: { "User-Agent": "Claude-Code/1.0", Accept: "text/html" },
        });
        assert.equal(response.status, 200);
        assert.match(response.headers.get("content-type"), /text\/html/);
        assert.match(response.headers.get("cache-control"), /private/);
        assert.match(response.headers.get("cache-control"), /no-store/);
        const journey = (await response.text()).match(
          /ntr=([A-Za-z0-9_-]+)/
        )?.[1];
        assert.ok(journey);
        journeys.push(journey);
      }
      assert.notEqual(journeys[0], journeys[1]);
      const markdown = await fetch(`${url}/privacy.md`, {
        headers: { "User-Agent": "Claude-Code/1.0" },
      });
      assert.equal(markdown.status, 200);
      assert.match(markdown.headers.get("content-type"), /text\/markdown/);
      assert.match(markdown.headers.get("cache-control"), /no-store/);
      await markdown.text();
    }
  );
});
