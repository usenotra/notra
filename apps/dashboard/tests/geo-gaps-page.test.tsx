import { beforeEach, describe, expect, mock, test } from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";

import {
  GeoProjectQueryProvider,
  useGeoProjectScope,
} from "@/components/providers/geo-project-provider";

let settingsFails = false;
let gapsFails = false;
let cachedGaps = false;
let configured = true;
let projectParam: string | null = null;
const retrySettings = mock(async () => undefined);
const retryGaps = mock(async () => undefined);

mock.module("next/navigation", () => ({
  useRouter: () => ({ push: mock() }),
  usePathname: () => "/fixture/geo/gaps",
}));
mock.module("@/components/providers/organization-provider", () => ({
  useOrganizationsContext: () => ({
    activeOrganization: { id: "org-fixture", slug: "fixture" },
    getOrganization: () => undefined,
  }),
}));
mock.module("@/lib/hooks/use-geo-project-query", () => ({
  useGeoProjectQueryState: () => [projectParam],
}));
mock.module("@/lib/hooks/use-geo", () => ({
  useGeoSettings: () => ({
    data: settingsFails
      ? undefined
      : { settings: configured ? { id: "settings-fixture" } : null },
    isPending: false,
    isError: settingsFails,
    isFetching: false,
    refetch: retrySettings,
  }),
  useGeoCompetitors: () => ({ data: { competitors: [] } }),
  useGeoStartScan: () => ({ mutate: mock() }),
  useGeoRescanPrompt: () => ({ mutate: mock() }),
  useIsGeoScanning: () => false,
  useGeoSuggestionDismiss: () => ({ isPending: false, mutate: mock() }),
}));
mock.module("@/lib/hooks/use-geo-writer", () => ({
  useGeoWriterGaps: () => ({
    data:
      !gapsFails || cachedGaps
        ? { hasScanData: true, promptGaps: [], searchGaps: [] }
        : undefined,
    isPending: false,
    isError: gapsFails,
    isFetching: false,
    refetch: retryGaps,
  }),
}));
mock.module("@/components/geo/gaps-table", () => ({
  GeoGapsTable: () => {
    const { projectId } = useGeoProjectScope();
    return <div data-project={projectId}>Loaded gaps table</div>;
  },
}));
mock.module("@/components/geo/writer/page-gate", () => ({
  GeoWriterNeedsSetup: () => <h1>Set up your brand</h1>,
}));
mock.module("@/components/geo/writer/write-dialog", () => ({
  WriteDialog: () => <div>Writer dialog mounted</div>,
}));

const { default: GeoGapsPage } =
  await import("../src/app/(dashboard)/[slug]/geo/gaps/page-client");

beforeEach(() => {
  settingsFails = false;
  gapsFails = false;
  cachedGaps = false;
  configured = true;
  projectParam = null;
});

describe("Content Gaps load failures", () => {
  test("inherits the server project until an explicit URL selection overrides it", () => {
    const page = (
      <GeoProjectQueryProvider initialProjectId="cookie-project">
        <GeoGapsPage organizationSlug="fixture" />
      </GeoProjectQueryProvider>
    );
    expect(renderToStaticMarkup(page)).toContain(
      'data-project="cookie-project"'
    );
    projectParam = "url-project";
    expect(renderToStaticMarkup(page)).toContain('data-project="url-project"');
  });

  test("does not mount the writer before a write action", () => {
    const html = renderToStaticMarkup(
      <GeoGapsPage organizationSlug="fixture" />
    );

    expect(html).toContain("Loaded gaps table");
    expect(html).not.toContain("Writer dialog mounted");
  });

  test("preserves setup when settings confirm that no brand is configured", () => {
    configured = false;
    gapsFails = true;
    const html = renderToStaticMarkup(
      <GeoGapsPage organizationSlug="fixture" />
    );

    expect(html).toContain("Set up your brand");
    expect(html).not.toContain('role="alert"');
  });

  test("shows a retryable error rather than setup when settings fail", () => {
    settingsFails = true;
    const html = renderToStaticMarkup(
      <GeoGapsPage organizationSlug="fixture" />
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain("Retry");
    expect(html).not.toContain("Set up your brand");
  });

  test("shows a retryable error rather than an empty table when gaps fail", () => {
    gapsFails = true;
    const html = renderToStaticMarkup(
      <GeoGapsPage organizationSlug="fixture" />
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain("Retry");
    expect(html).not.toContain("Loaded gaps table");
  });

  test("keeps previously loaded gaps visible after a background refresh fails", () => {
    gapsFails = true;
    cachedGaps = true;
    const html = renderToStaticMarkup(
      <GeoGapsPage organizationSlug="fixture" />
    );

    expect(html).toContain("Loaded gaps table");
    expect(html).not.toContain('role="alert"');
  });
});
