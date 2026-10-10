import { describe, expect, test } from "bun:test";
import { createServer } from "node:http";

import { runSmokeCli } from "./utils/smoke-cli";

describe("GEO scan CLI", () => {
  test("no arguments prints help without database imports or HTTP requests", async () => {
    let requests = 0;
    const server = Bun.serve({
      port: 0,
      fetch: () => {
        requests++;
        return Response.json({});
      },
    });
    try {
      const result = await runSmokeCli([], {
        GEO_RUNNER_URL: server.url.toString(),
        DATABASE_URL: "postgresql://secret:password@remote.invalid/db",
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Starting a scan calls billable models");
      expect(result.stderr).toBe("");
      expect(requests).toBe(0);
    } finally {
      server.stop(true);
    }
  });

  test("uses HTTP without DATABASE_URL and retries POST with one printed idempotency key", async () => {
    const keys: Array<string | null> = [];
    const inputs: unknown[] = [];
    const server = Bun.serve({
      port: 0,
      async fetch(request) {
        const path = new URL(request.url).pathname;
        if (path === "/models") {
          return Response.json({
            models: [
              { id: "openai/test", default: true, supportsWebSearch: true },
              { id: "anthropic/test" },
            ],
          });
        }
        if (path === "/scans") {
          keys.push(request.headers.get("idempotency-key"));
          inputs.push(await request.json());
          return keys.length === 1
            ? Response.json({}, { status: 503 })
            : Response.json(
                { id: "scan-1", status: "queued" },
                { status: 202 }
              );
        }
        if (path === "/scans/scan-1") {
          return Response.json({
            id: "scan-1",
            status: "completed",
            results: { checks: [{ answer: "test answer" }] },
          });
        }
        return Response.json({ ok: true });
      },
    });
    try {
      const result = await runSmokeCli([
        "org",
        "project",
        "test prompt",
        "--url",
        server.url.toString(),
        "--models",
        "openai/test,anthropic/test",
        "--language",
        "German",
        "--no-web-search",
        "--json",
        "--idempotency-key",
        "stable-key",
      ]);
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual({
        id: "scan-1",
        status: "completed",
        results: { checks: [{ answer: "test answer" }] },
      });
      expect(result.stdout.trim().split("\n")).toHaveLength(1);
      expect(result.stderr).toContain("Idempotency-Key: stable-key");
      expect(result.stderr).not.toContain("test-cli-secret");
      expect(keys).toEqual(["stable-key", "stable-key"]);
      expect(inputs).toEqual([
        expect.objectContaining({
          engines: ["openai/test", "anthropic/test"],
          language: "German",
          webSearch: false,
        }),
        expect.objectContaining({
          engines: ["openai/test", "anthropic/test"],
          language: "German",
          webSearch: false,
        }),
      ]);
    } finally {
      server.stop(true);
    }
  });

  test("resumes only a scoped GET and writes the final failed envelope", async () => {
    const requests: string[] = [];
    const server = Bun.serve({
      port: 0,
      fetch(request) {
        requests.push(
          `${request.method} ${new URL(request.url).pathname}${new URL(request.url).search}`
        );
        return Response.json({
          id: "old-scan",
          status: "failed",
          errorCode: "interrupted",
          results: null,
        });
      },
    });
    try {
      const result = await runSmokeCli([
        "org",
        "project",
        "--url",
        server.url.toString(),
        "--scan-id",
        "old-scan",
        "--json",
      ]);
      expect(result.exitCode).toBe(1);
      expect(JSON.parse(result.stdout).errorCode).toBe("interrupted");
      expect(requests).toEqual([
        "GET /scans/old-scan?organizationId=org&projectId=project",
      ]);
      expect(result.stderr).not.toContain("Idempotency-Key");
    } finally {
      server.stop(true);
    }
  });

  test("retries a lost POST response with the same generated key", async () => {
    const keys: Array<string | string[] | undefined> = [];
    const server = createServer((request, response) => {
      const path = new URL(request.url ?? "/", "http://localhost").pathname;
      if (path === "/scans") {
        keys.push(request.headers["idempotency-key"]);
        if (keys.length === 1) {
          request.socket.destroy();
          return;
        }
      }
      let body: object = { ok: true };
      if (path === "/models") {
        body = {
          models: [
            { id: "openai/test", default: true, supportsWebSearch: true },
          ],
        };
      } else if (path === "/scans") {
        body = { id: "lost-response", status: "queued" };
      } else if (path === "/scans/lost-response") {
        body = { id: "lost-response", status: "completed", results: {} };
      }
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(body));
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve)
    );
    try {
      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("Mock server has no TCP address");
      }
      const result = await runSmokeCli([
        "org",
        "project",
        "prompt",
        "--url",
        `http://127.0.0.1:${address.port}`,
        "--json",
      ]);
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout).id).toBe("lost-response");
      expect(keys).toHaveLength(2);
      expect(typeof keys[0]).toBe("string");
      expect(keys[0]).toBe(keys[1]);
      expect(result.stderr).toContain(`Idempotency-Key: ${keys[0]}`);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  test("refuses remote fixtures before HTTP or database access", async () => {
    let requests = 0;
    const server = Bun.serve({
      port: 0,
      fetch: () => {
        requests++;
        return Response.json({ ok: true });
      },
    });
    try {
      for (const env of [
        { DATABASE_URL: "postgresql://secret:password@remote.invalid/db" },
        { DATABASE_URL: "postgresql://127.0.0.1:1/db", NODE_ENV: "production" },
        {
          DATABASE_URL:
            "postgresql://localhost/db?host=remote-production.example",
        },
      ]) {
        const result = await runSmokeCli(
          ["--fixture", "--url", server.url.toString()],
          env
        );
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain("loopback");
        expect(result.stderr).not.toContain("password");
        expect(result.stderr).not.toContain("Redis");
      }
      expect(requests).toBe(0);
    } finally {
      server.stop(true);
    }
  });

  test("rejects unavailable model IDs before POST and does not retry 4xx", async () => {
    const requests: string[] = [];
    const inputs: unknown[] = [];
    const server = Bun.serve({
      port: 0,
      async fetch(request) {
        const path = new URL(request.url).pathname;
        requests.push(path);
        if (path === "/models") {
          return Response.json({
            models: [{ id: "openai/test", supportsWebSearch: false }],
          });
        }
        if (path === "/scans") {
          inputs.push(await request.json());
          return Response.json(
            { echoedSecret: request.headers.get("authorization") },
            { status: 422 }
          );
        }
        return Response.json({ ok: true });
      },
    });
    try {
      const unknown = await runSmokeCli([
        "org",
        "project",
        "prompt",
        "missing/model",
        "--url",
        server.url.toString(),
      ]);
      expect(unknown.exitCode).toBe(1);
      expect(unknown.stderr).toContain("unavailable");
      expect(requests).not.toContain("/scans");
      const denied = await runSmokeCli([
        "org",
        "project",
        "prompt",
        "--url",
        server.url.toString(),
      ]);
      expect(denied.exitCode).toBe(1);
      expect(denied.stderr).toContain("HTTP 422");
      expect(denied.stderr).not.toContain("test-cli-secret");
      expect(requests.filter((path) => path === "/scans")).toHaveLength(1);
      expect(inputs).toEqual([expect.objectContaining({ webSearch: false })]);
    } finally {
      server.stop(true);
    }
  });

  test("does not forward bearer credentials through redirects", async () => {
    let redirectedRequests = 0;
    const destination = Bun.serve({
      port: 0,
      fetch: () => {
        redirectedRequests++;
        return Response.json({ status: "completed" });
      },
    });
    const server = Bun.serve({
      port: 0,
      fetch: () => Response.redirect(destination.url.toString(), 307),
    });
    try {
      const result = await runSmokeCli([
        "org",
        "project",
        "--scan-id",
        "old",
        "--url",
        server.url.toString(),
      ]);
      expect(result.exitCode).toBe(1);
      expect(redirectedRequests).toBe(0);
      expect(result.stderr).not.toContain("test-cli-secret");
    } finally {
      server.stop(true);
      destination.stop(true);
    }
  });

  test("bounds polling and reports the scan ID for resuming", async () => {
    let posts = 0;
    const server = Bun.serve({
      port: 0,
      fetch(request) {
        if (request.method === "POST") {
          posts++;
        }
        return Response.json({ id: "waiting", status: "queued" });
      },
    });
    try {
      const result = await runSmokeCli([
        "org",
        "project",
        "--scan-id",
        "waiting",
        "--url",
        server.url.toString(),
        "--timeout",
        "1",
      ]);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Resume with --scan-id waiting");
      expect(result.stdout).toBe("");
      expect(posts).toBe(0);
    } finally {
      server.stop(true);
    }
  });

  test("fails promptly for invalid scan response shapes", async () => {
    const server = Bun.serve({
      port: 0,
      fetch: () => Response.json({ status: "mystery" }),
    });
    try {
      const result = await runSmokeCli([
        "org",
        "project",
        "--scan-id",
        "old",
        "--url",
        server.url.toString(),
      ]);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("invalid scan status");
    } finally {
      server.stop(true);
    }
  });

  test("does not poll when a successful create response has no scan ID", async () => {
    let polls = 0;
    const server = Bun.serve({
      port: 0,
      fetch(request) {
        const path = new URL(request.url).pathname;
        if (path === "/models") {
          return Response.json({ models: [{ id: "openai/test" }] });
        }
        if (path.startsWith("/scans/")) {
          polls++;
        }
        return Response.json({ ok: true });
      },
    });
    try {
      const result = await runSmokeCli([
        "org",
        "project",
        "prompt",
        "--url",
        server.url.toString(),
      ]);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("invalid scan ID");
      expect(polls).toBe(0);
    } finally {
      server.stop(true);
    }
  });
});
