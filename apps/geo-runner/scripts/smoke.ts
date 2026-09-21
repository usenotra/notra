import { db } from "@notra/db/drizzle";
import {
  brandSettings,
  geoSettings,
  organizations,
  projects,
} from "@notra/db/schema";
import { eq, or } from "drizzle-orm";

import { RUNNER_LOCAL_SECRET } from "../src/constants/runner";

const args = process.argv.slice(2);
const production = args.includes("--prod");
const positional = args.filter((argument) => argument !== "--prod");
const localFixture = !production && positional.length === 0;
const [organizationId, projectId, prompt, requestedModel] = localFixture
  ? [
      "geo-smoke-org",
      "geo-smoke-project",
      "What are the best AI content marketing tools?",
    ]
  : positional;
const baseUrl = production
  ? process.env.GEO_RUNNER_PROD_URL?.replace(/\/$/, "")
  : "http://localhost:3000";
const secret = production
  ? process.env.GEO_RUNNER_PROD_SECRET
  : (process.env.GEO_RUNNER_SECRET ?? RUNNER_LOCAL_SECRET);

if (!(organizationId && projectId && prompt)) {
  console.error(
    'Usage: bun geo:smoke [--prod] <organization-id> <project-id> "<prompt>" [model-id]'
  );
  process.exit(1);
}
if (!(baseUrl && secret)) {
  throw new Error(
    production
      ? "Set GEO_RUNNER_PROD_URL and GEO_RUNNER_PROD_SECRET in the root .env"
      : "Local runner configuration is missing"
  );
}

const scanInput = { organizationId, projectId, prompt };
const authorization = { authorization: `Bearer ${secret}` };

const LEGACY_FIXTURE_SLUG = "geo-smoke-test";
const FIXTURE_BRAND_ID = "geo-smoke-brand";

async function seedLocalFixture() {
  const fixtureId = scanInput.organizationId;
  await db.transaction(async (transaction) => {
    await transaction
      .insert(organizations)
      .values({
        id: fixtureId,
        name: "GEO Smoke Test",
        slug: fixtureId,
        createdAt: new Date(),
      })
      .onConflictDoNothing();
    const matches = await transaction
      .select({ id: organizations.id, slug: organizations.slug })
      .from(organizations)
      .where(
        or(
          eq(organizations.id, fixtureId),
          eq(organizations.slug, fixtureId),
          eq(organizations.slug, LEGACY_FIXTURE_SLUG)
        )
      );
    const organization =
      matches.find((row) => row.id === fixtureId) ??
      matches.find((row) => row.slug === fixtureId) ??
      matches.find((row) => row.slug === LEGACY_FIXTURE_SLUG);
    if (!organization) {
      throw new Error(
        "GEO smoke fixture organization could not be created or found"
      );
    }
    scanInput.organizationId = organization.id;

    await transaction
      .insert(brandSettings)
      .values({
        id: FIXTURE_BRAND_ID,
        organizationId: scanInput.organizationId,
        name: "Default",
        websiteUrl: "https://www.usenotra.com",
        companyName: "Notra",
      })
      .onConflictDoNothing();
    const [brand] = await transaction
      .select({ id: brandSettings.id })
      .from(brandSettings)
      .where(eq(brandSettings.id, FIXTURE_BRAND_ID))
      .limit(1);
    if (!brand) {
      await transaction.insert(brandSettings).values({
        id: FIXTURE_BRAND_ID,
        organizationId: scanInput.organizationId,
        name: "GEO Smoke Test",
        isDefault: false,
        websiteUrl: "https://www.usenotra.com",
        companyName: "Notra",
      });
    }
    await transaction
      .insert(projects)
      .values({
        id: scanInput.projectId,
        organizationId: scanInput.organizationId,
        name: "GEO Smoke Test",
        brandSettingsId: "geo-smoke-brand",
      })
      .onConflictDoNothing();
    await transaction
      .insert(geoSettings)
      .values({
        id: "geo-smoke-settings",
        organizationId: scanInput.organizationId,
        projectId: scanInput.projectId,
        companyName: "Notra",
      })
      .onConflictDoNothing();
  });
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${await response.text()}`);
  }
  return response.json() as Promise<T>;
}

await request<{ ok: true }>("/health");
await request<{ ok: true }>("/ready");
if (localFixture) {
  await seedLocalFixture();
}

const query = new URLSearchParams({
  organizationId: scanInput.organizationId,
  projectId: scanInput.projectId,
});
const { models } = await request<{
  models: Array<{
    id: string;
    default?: boolean;
    supportsWebSearch?: boolean;
  }>;
}>(`/models?${query}`, { headers: authorization });
const automatic =
  models.find((item) => item.default && item.supportsWebSearch) ??
  models.find((item) => item.supportsWebSearch) ??
  models.find((item) => item.default) ??
  models[0];
const chosen = requestedModel
  ? {
      id: requestedModel,
      supportsWebSearch:
        models.find((item) => item.id === requestedModel)?.supportsWebSearch ===
        true,
    }
  : automatic;
if (!chosen) {
  throw new Error("No model is available for this project");
}

console.log(`Starting scan with ${chosen.id}`);
const { id } = await request<{ id: string }>("/scans", {
  method: "POST",
  headers: {
    ...authorization,
    "content-type": "application/json",
    "idempotency-key": crypto.randomUUID(),
  },
  body: JSON.stringify({
    ...scanInput,
    engines: [chosen.id],
    webSearch: chosen.supportsWebSearch === true,
  }),
});

const deadline = Date.now() + 5 * 60_000;
let previousStatus = "";
while (Date.now() < deadline) {
  const scan = await request<{
    status: "queued" | "running" | "completed" | "failed";
    errorCode?: string;
    errorMessage?: string;
    results?: unknown;
  }>(`/scans/${id}?${query}`, { headers: authorization });

  if (scan.status !== previousStatus) {
    console.log(`${id}: ${scan.status}`);
    previousStatus = scan.status;
  }
  if (scan.status === "completed") {
    console.log(JSON.stringify(scan.results, null, 2));
    process.exit(0);
  }
  if (scan.status === "failed") {
    throw new Error(
      `${scan.errorCode ?? "scan_failed"}: ${scan.errorMessage ?? "Scan failed"}`
    );
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

throw new Error(`Timed out waiting for scan ${id}`);
