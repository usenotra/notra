import {
  GEO_INGEST_DEFAULT_FRAMEWORK,
  GEO_INGEST_DEFAULT_PACKAGE_MANAGER,
  GEO_INGEST_FRAMEWORK_OPTIONS,
  GEO_INGEST_INSTALL_COMMAND,
  GEO_INGEST_PACKAGE_MANAGER_OPTIONS,
  GEO_INGEST_SNIPPET_FALLBACK,
  GEO_INGEST_TOKEN_ENV,
} from "@notra/geo-core/constants/geo";
import type {
  GeoIngestFramework,
  GeoIngestPackageManager,
  GeoIngestSetupResponse,
} from "@notra/geo-core/types/geo";

export function geoIngestSnippet(
  setup: GeoIngestSetupResponse | undefined,
  framework: GeoIngestFramework = GEO_INGEST_DEFAULT_FRAMEWORK
): string {
  return (
    setup?.snippets?.[framework] ||
    setup?.snippet ||
    GEO_INGEST_SNIPPET_FALLBACK
  );
}

export function geoIngestInstallCommand(
  packageManager: GeoIngestPackageManager = GEO_INGEST_DEFAULT_PACKAGE_MANAGER
): string {
  return (
    GEO_INGEST_PACKAGE_MANAGER_OPTIONS.find(
      (candidate) => candidate.value === packageManager
    )?.command ?? GEO_INGEST_INSTALL_COMMAND
  );
}

export function geoIngestAgentPrompt(
  setup: GeoIngestSetupResponse | undefined,
  framework: GeoIngestFramework = GEO_INGEST_DEFAULT_FRAMEWORK,
  packageManager: GeoIngestPackageManager = GEO_INGEST_DEFAULT_PACKAGE_MANAGER
): string {
  const option = GEO_INGEST_FRAMEWORK_OPTIONS.find(
    (candidate) => candidate.value === framework
  );
  const file = option?.file ?? "proxy.ts";
  const label = option?.label ?? "Next.js";

  return [
    `Set up Notra GEO tracking (AI crawler and referral analytics) in this ${label} project.`,
    "",
    `1. Install the package: \`${geoIngestInstallCommand(packageManager)}\` (use this project's package manager if it differs).`,
    `2. Create ${file} with the following content. If the file already exists, merge the tracking call into it instead of replacing it:`,
    "",
    "```ts",
    geoIngestSnippet(setup, framework),
    "```",
    "",
    `3. Add ${GEO_INGEST_TOKEN_ENV} to the site's environment variables (local env file and hosting provider). Repeat for every domain this project tracks. Ask me for the value - never hardcode or commit it.`,
  ].join("\n");
}

export function isGeoIngestPackageManager(
  value: string
): value is GeoIngestPackageManager {
  return GEO_INGEST_PACKAGE_MANAGER_OPTIONS.some(
    (option) => option.value === value
  );
}
