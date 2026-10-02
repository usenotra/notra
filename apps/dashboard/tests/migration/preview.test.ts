import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

import { previewConfig } from "../../scripts/migration/utils/preview-config.mjs";
import { sanitizedEnvironment } from "../../scripts/migration/utils/sanitized-environment.mjs";
import { FIXTURE } from "./constants/parity.mjs";

test("preview defaults to anonymous production and ignores inherited impersonation", () => {
  const source = {
    PATH: "/usr/bin",
    NODE_ENV: "development",
    DEV_AUTH_ENABLED: "true",
    DEV_AUTH_EMAIL: "untrusted@example.invalid",
    OPENAI_API_KEY: "private",
  };
  const config = previewConfig([], source);
  expect(config).toEqual(previewConfig(["production-anonymous"], source));
  expect(config).toEqual({
    args: [".output/server/index.mjs"],
    env: { ...sanitizedEnvironment(source), HOST: "0.0.0.0", PORT: "3000" },
  });
  expect(config.env.NODE_ENV).toBe("production");
  expect(config.env.DEV_AUTH_ENABLED).toBe("false");
  expect(config.env).not.toHaveProperty("DEV_AUTH_EMAIL");
  expect(config.env).not.toHaveProperty("OPENAI_API_KEY");
});

test("development preview explicitly selects the fixture and binds only to loopback", () => {
  const source = {
    HOST: "0.0.0.0",
    PORT: "9999",
    DEV_AUTH_EMAIL: "untrusted@example.invalid",
    WORKOS_API_KEY: "private",
  };
  const config = previewConfig(["development-fixture"], source);
  expect(config.args).toEqual([
    "node_modules/vite/bin/vite.js",
    "--host",
    "127.0.0.1",
    "--port",
    "3000",
    "--strictPort",
  ]);
  expect(config.env).toEqual({
    ...sanitizedEnvironment(source),
    NODE_ENV: "development",
    DEV_AUTH_ENABLED: "true",
    DEV_AUTH_EMAIL: FIXTURE.email,
    HOST: "127.0.0.1",
    PORT: "3000",
  });
});

test("preview rejects unknown modes and extra arguments before spawning a server", () => {
  for (const argv of [
    ["development"],
    [""],
    ["production-anonymous", "development-fixture"],
  ]) {
    expect(() => previewConfig(argv)).toThrow("Usage:");
  }
  const run = spawnSync(
    "node",
    [
      new URL("../../scripts/migration/preview.mjs", import.meta.url).pathname,
      "unknown-mode",
    ],
    { encoding: "utf8", timeout: 5000 }
  );
  expect(run.status).toBe(1);
  expect(run.stderr).toContain("Usage:");
});
