import { parseArgs } from "node:util";

import { RUNNER_LOCAL_SECRET } from "../../src/constants/runner";
import { SMOKE_FIXTURE } from "../constants/smoke";
import type { SmokeOptions } from "../types/smoke";

function isLoopback(hostname: string): boolean {
  return ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
}

export function parseSmokeOptions(args: string[]): SmokeOptions | null {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      help: { type: "boolean" },
      prod: { type: "boolean" },
      fixture: { type: "boolean" },
      json: { type: "boolean" },
      url: { type: "string" },
      models: { type: "string" },
      language: { type: "string" },
      "no-web-search": { type: "boolean" },
      "idempotency-key": { type: "string" },
      "scan-id": { type: "string" },
      timeout: { type: "string" },
    },
  });
  if (args.length === 0 || values.help) {
    return null;
  }
  const urlInput =
    values.url ??
    (values.prod
      ? process.env.GEO_RUNNER_PROD_URL
      : (process.env.GEO_RUNNER_URL ?? "http://127.0.0.1:3000"));
  let url: URL;
  try {
    url = new URL(urlInput ?? "");
  } catch {
    throw new Error(
      "Set a valid runner URL with --url or GEO_RUNNER_PROD_URL."
    );
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "Runner URL must be HTTP(S), without credentials, query, or fragment."
    );
  }
  if (values.fixture) {
    let database: URL;
    try {
      database = new URL(process.env.DATABASE_URL ?? "");
    } catch {
      throw new Error("--fixture requires a loopback PostgreSQL DATABASE_URL.");
    }
    if (
      values.prod ||
      process.env.NODE_ENV === "production" ||
      url.protocol !== "http:" ||
      !isLoopback(url.hostname) ||
      !["postgres:", "postgresql:"].includes(database.protocol) ||
      database.search ||
      database.hash ||
      !isLoopback(database.hostname)
    ) {
      throw new Error(
        "--fixture only allows development with loopback HTTP and PostgreSQL."
      );
    }
    if (positionals.length > 0 || values["scan-id"]) {
      throw new Error(
        "--fixture cannot be combined with positional scopes or --scan-id."
      );
    }
  }
  const scopedResume = values["scan-id"] !== undefined;
  if (
    !values.fixture &&
    (positionals.length < (scopedResume ? 2 : 3) ||
      positionals.length > (scopedResume ? 2 : 4))
  ) {
    throw new Error(
      "Provide organization ID, project ID, and prompt; --scan-id needs only the two IDs."
    );
  }
  if (
    scopedResume &&
    (values.models !== undefined || values["idempotency-key"])
  ) {
    throw new Error(
      "--scan-id cannot be combined with --models or --idempotency-key."
    );
  }
  if (values.models !== undefined && positionals[3]) {
    throw new Error("Choose --models or the positional model ID, not both.");
  }
  let models: string[] = [];
  if (values.models !== undefined) {
    models = values.models.split(",").map((id) => id.trim());
  } else if (positionals[3]) {
    models = [positionals[3]];
  }
  if (
    models.length > 5 ||
    models.some((id) => !id) ||
    new Set(models).size !== models.length
  ) {
    throw new Error("--models must contain one to five distinct model IDs.");
  }
  const timeoutSeconds = Number(values.timeout ?? "300");
  if (
    !Number.isFinite(timeoutSeconds) ||
    timeoutSeconds < 1 ||
    timeoutSeconds > 3600
  ) {
    throw new Error("--timeout must be between 1 and 3600 seconds.");
  }
  const idempotencyKey = values["idempotency-key"] ?? crypto.randomUUID();
  if (!/^[\u0021-\u007e]{1,128}$/.test(idempotencyKey)) {
    throw new Error(
      "--idempotency-key must contain 1 to 128 printable characters without spaces."
    );
  }
  const secret = values.prod
    ? process.env.GEO_RUNNER_PROD_SECRET?.trim()
    : process.env.GEO_RUNNER_SECRET?.trim() ||
      (isLoopback(url.hostname) ? RUNNER_LOCAL_SECRET : undefined);
  if (!secret) {
    throw new Error(
      "Set GEO_RUNNER_SECRET, or GEO_RUNNER_PROD_SECRET with --prod."
    );
  }
  const organizationId = values.fixture
    ? SMOKE_FIXTURE.organizationId
    : positionals[0];
  const projectId = values.fixture ? SMOKE_FIXTURE.projectId : positionals[1];
  const prompt = values.fixture ? SMOKE_FIXTURE.prompt : (positionals[2] ?? "");
  if (
    !organizationId?.trim() ||
    !projectId?.trim() ||
    (!scopedResume && !prompt.trim())
  ) {
    throw new Error(
      "Organization ID, project ID, and prompt must not be empty."
    );
  }
  if (scopedResume && !values["scan-id"]?.trim()) {
    throw new Error("--scan-id must not be empty.");
  }
  return {
    baseUrl: url.toString().replace(/\/$/, ""),
    secret,
    organizationId,
    projectId,
    prompt,
    models,
    language: values.language ?? "English",
    webSearch: !values["no-web-search"],
    fixture: values.fixture ?? false,
    json: values.json ?? false,
    idempotencyKey,
    scanId: values["scan-id"],
    timeoutMs: Math.floor(timeoutSeconds * 1000),
  };
}
