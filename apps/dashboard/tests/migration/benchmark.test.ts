import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { once } from "node:events";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { localUrl } from "../../scripts/migration/utils/benchmark-config.mjs";
import { measureHttp } from "../../scripts/migration/utils/measure-http.mjs";
import {
  assertNoDotenv,
  sanitizedEnvironment,
} from "../../scripts/migration/utils/sanitized-environment.mjs";
import { timingSummary } from "../../scripts/migration/utils/timing-summary.mjs";

describe("migration benchmark isolation", () => {
  test("runner clears fixture build outputs, writes raw samples, and reports failure", () => {
    const directory = mkdtempSync(join(tmpdir(), "notra-benchmark-runner-"));
    try {
      const runner = new URL(
        "../../scripts/migration/benchmark.mjs",
        import.meta.url
      ).pathname;
      mkdirSync(join(directory, ".next"));
      writeFileSync(join(directory, ".next", "stale"), "fixture");
      for (const exitCode of [0, 7]) {
        const output = join(directory, `result-${exitCode}.json`);
        const config = join(directory, `config-${exitCode}.json`);
        writeFileSync(
          config,
          JSON.stringify({
            label: "runner-test-not-dashboard-benchmark",
            cwd: directory,
            output,
            samples: 2,
            timeoutMs: 3000,
            command: [process.execPath, "-e", `process.exit(${exitCode})`],
          })
        );
        const run = spawnSync("node", [runner, "build", config], {
          encoding: "utf8",
        });
        expect(run.status).toBe(exitCode === 0 ? 0 : 1);
        const result = JSON.parse(readFileSync(output, "utf8"));
        expect(result.passed).toBe(exitCode === 0);
        expect(result.samples).toHaveLength(exitCode === 0 ? 2 : 1);
        expect(result.samples[0].exitCode).toBe(exitCode);
        expect(result.summary?.count ?? 0).toBe(exitCode === 0 ? 2 : 0);
        expect(result.harnessSha256).toHaveLength(64);
        expect(existsSync(join(directory, ".next"))).toBe(false);
        const repeat = spawnSync("node", [runner, "build", config], {
          encoding: "utf8",
        });
        expect(repeat.status).not.toBe(0);
        expect(repeat.stderr).toContain("Refusing to overwrite");
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("never inherits service credentials or development impersonation", () => {
    const env = sanitizedEnvironment({
      PATH: "/usr/bin",
      DATABASE_URL: "postgresql://private.invalid/production",
      WORKOS_API_KEY: "private",
      DEV_AUTH_ENABLED: "true",
      OPENAI_API_KEY: "private",
      NODE_OPTIONS: "--require=private",
      HOME: "/private",
    });
    expect(env.DATABASE_URL).toBe(
      "postgresql://notra_test:notra_test@127.0.0.1:5432/notra_migration_test"
    );
    expect(env.WORKOS_API_KEY).toBe("sk_test_migration_placeholder");
    expect(env.DEV_AUTH_ENABLED).toBe("false");
    expect(env).not.toHaveProperty("OPENAI_API_KEY");
    expect(env).not.toHaveProperty("NODE_OPTIONS");
    expect(env).not.toHaveProperty("HOME");
  });

  test("rejects dotenv rather than allowing framework automatic loading", () => {
    const directory = mkdtempSync(join(tmpdir(), "notra-benchmark-env-"));
    try {
      writeFileSync(join(directory, ".env.local"), "PRIVATE=not-a-real-secret");
      expect(() => assertNoDotenv(directory)).toThrow(
        "Dotenv files are forbidden"
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("only permits literal loopback HTTP without URL credentials", () => {
    expect(localUrl("http://127.0.0.1:3000/").hostname).toBe("127.0.0.1");
    expect(localUrl("http://[::1]:3000/").hostname).toBe("[::1]");
    for (const url of [
      "https://127.0.0.1/",
      "http://localhost/",
      "http://example.com/",
      "http://user:password@127.0.0.1/",
      "http://127.0.0.1/#fragment",
    ]) {
      expect(() => localUrl(url)).toThrow();
    }
  });

  test("keeps redirects local and consumes response bodies without retaining them", async () => {
    const server = createServer((request, response) => {
      if (request.url === "/redirect") {
        response.writeHead(302, {
          location: "https://example.invalid/private",
        });
        response.end();
        return;
      }
      response.writeHead(200);
      response.end("fixture");
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    try {
      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("Expected a TCP fixture server address");
      }
      const redirect = await measureHttp(
        `http://127.0.0.1:${address.port}/redirect`,
        1000
      );
      expect(redirect.status).toBe(302);
      expect(redirect.error).toBeNull();
      const response = await measureHttp(
        `http://127.0.0.1:${address.port}/`,
        1000
      );
      expect(response.status).toBe(200);
      expect(response.bytes).toBe(7);
      expect(response).not.toHaveProperty("body");
      expect(response).not.toHaveProperty("headers");
    } finally {
      const closed = once(server, "close");
      server.closeAllConnections();
      server.close();
      await closed;
    }
  });

  test("reports median and nearest-rank p95 without mutating raw samples", () => {
    const samples = [40, 10, 30, 20];
    expect(timingSummary(samples)).toEqual({
      count: 4,
      minMs: 10,
      medianMs: 25,
      p95Ms: 40,
      maxMs: 40,
    });
    expect(samples).toEqual([40, 10, 30, 20]);
    expect(timingSummary([])).toBeNull();
  });
});
