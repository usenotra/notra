import { SMOKE_HELP, SMOKE_POLL_INTERVAL_MS } from "./constants/smoke";
import type { SmokeModel, SmokeOptions, SmokeScan } from "./types/smoke";
import { smokeRequest } from "./utils/smoke-http";
import { parseSmokeOptions } from "./utils/smoke-options";

async function run(options: SmokeOptions): Promise<number> {
  const deadline = Date.now() + options.timeoutMs;
  const authorization = { authorization: `Bearer ${options.secret}` };
  const request = <T>(path: string, init?: RequestInit) =>
    smokeRequest<T>(options.baseUrl, path, deadline, init);
  const query = new URLSearchParams({
    organizationId: options.organizationId,
    projectId: options.projectId,
  });
  let scanId = options.scanId;
  if (!scanId) {
    await request("/health");
    await request("/ready");
    if (options.fixture) {
      await (await import("./utils/smoke-fixture")).seedSmokeFixture();
    }
    const { models } = await request<{ models: SmokeModel[] }>(
      `/models?${query}`,
      { headers: authorization }
    );
    if (
      !Array.isArray(models) ||
      models.some((model) => !model || typeof model.id !== "string")
    ) {
      throw new Error("Runner returned an invalid model catalog.");
    }
    const automatic =
      models.find((model) => model.default && model.supportsWebSearch) ??
      models.find((model) => model.supportsWebSearch) ??
      models.find((model) => model.default) ??
      models[0];
    let engines = options.models;
    if (engines.length === 0 && automatic) {
      engines = [automatic.id];
    }
    if (engines.length === 0) {
      throw new Error("No model is available for this project.");
    }
    const unknown = engines.filter(
      (id) => !models.some((model) => model.id === id)
    );
    if (unknown.length > 0) {
      throw new Error(
        `Models unavailable in this project's catalog: ${unknown.join(", ")}`
      );
    }
    console.error(`Idempotency-Key: ${options.idempotencyKey}`);
    console.error(`Starting scan with ${engines.join(", ")}`);
    const created = await request<{ id: string }>("/scans", {
      method: "POST",
      headers: {
        ...authorization,
        "content-type": "application/json",
        "idempotency-key": options.idempotencyKey,
      },
      body: JSON.stringify({
        organizationId: options.organizationId,
        projectId: options.projectId,
        prompt: options.prompt,
        engines,
        language: options.language,
        webSearch:
          options.webSearch &&
          (options.models.length > 0 || automatic?.supportsWebSearch === true),
      }),
    });
    if (!created || typeof created.id !== "string" || !created.id.trim()) {
      throw new Error("Runner returned an invalid scan ID.");
    }
    scanId = created.id;
  }
  console.error(`Scan-ID: ${scanId}`);
  let previousStatus = "";
  while (Date.now() < deadline) {
    const scan = await request<SmokeScan>(
      `/scans/${encodeURIComponent(scanId)}?${query}`,
      { headers: authorization }
    );
    if (
      !scan ||
      !["queued", "running", "completed", "failed"].includes(scan.status)
    ) {
      throw new Error("Runner returned an invalid scan status.");
    }
    if (scan.status !== previousStatus) {
      console.error(`${scanId}: ${scan.status}`);
      previousStatus = scan.status;
    }
    if (scan.status === "completed" || scan.status === "failed") {
      await Bun.write(
        Bun.stdout,
        `${JSON.stringify({ ...scan, id: scanId }, null, options.json ? undefined : 2)}\n`
      );
      return scan.status === "completed" ? 0 : 1;
    }
    await Bun.sleep(
      Math.min(SMOKE_POLL_INTERVAL_MS, Math.max(0, deadline - Date.now()))
    );
  }
  throw new Error(
    `Timed out waiting for scan ${scanId}. Resume with --scan-id ${scanId}.`
  );
}

try {
  const options = parseSmokeOptions(process.argv.slice(2));
  if (options) {
    process.exitCode = await run(options);
  } else {
    console.log(SMOKE_HELP);
  }
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "GEO scan command failed."
  );
  process.exitCode = 1;
}
process.exit(process.exitCode ?? 0);
