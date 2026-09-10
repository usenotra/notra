import { beforeEach, describe, expect, mock, test } from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";

import { GeoPageSkeleton } from "../src/app/(dashboard)/[slug]/geo/skeleton";

const geoFeature = mock(() => ({ isLocked: false, isLoading: true }));
const GeoPage = mock(() => <h1>Protected page content</h1>);

mock.module("@/lib/hooks/use-plan", () => ({
  useHasGeoFeature: geoFeature,
}));
mock.module("next/navigation", () => ({
  usePathname: () => "/fixture/geo/gaps",
  useRouter: () => ({ push: mock() }),
}));
mock.module("@/components/billing/geo-upgrade-dialog", () => ({
  GeoUpgradeDialog: () => <div>Upgrade required</div>,
}));
mock.module("@/components/empty-state-preview", () => ({
  EmptyStateAnalyticsPreview: () => null,
}));
mock.module("@/lib/analytics/posthog-client", () => ({ trackEvent: mock() }));
mock.module("@/lib/hooks/use-sidebar-mode", () => ({
  pickSidebarMode: mock(),
}));

const { GeoUpgradeGate } =
  await import("../src/components/geo/geo-upgrade-gate");

beforeEach(() => {
  geoFeature.mockReturnValue({ isLocked: false, isLoading: true });
  GeoPage.mockClear();
});

describe("GEO billing gate", () => {
  test("shows the GEO skeleton without rendering page children while billing loads", () => {
    const html = renderToStaticMarkup(
      <GeoUpgradeGate fallback={<GeoPageSkeleton />} slug="fixture">
        <GeoPage />
      </GeoUpgradeGate>
    );

    expect(html).toContain('data-slot="skeleton"');
    expect(html).not.toContain("Checking GEO access");
    expect(html).not.toContain("Protected page content");
    expect(html).not.toContain("Upgrade required");
    expect(GeoPage).not.toHaveBeenCalled();
  });

  test("renders the page for a confirmed entitled customer", () => {
    geoFeature.mockReturnValue({ isLocked: false, isLoading: false });
    const html = renderToStaticMarkup(
      <GeoUpgradeGate fallback={<GeoPageSkeleton />} slug="fixture">
        <GeoPage />
      </GeoUpgradeGate>
    );

    expect(html).toContain("Protected page content");
    expect(html).not.toContain("Upgrade required");
    expect(GeoPage).toHaveBeenCalledTimes(1);
  });

  test("keeps the paywall and excludes page children for a confirmed locked customer", () => {
    geoFeature.mockReturnValue({ isLocked: true, isLoading: false });
    const html = renderToStaticMarkup(
      <GeoUpgradeGate fallback={<GeoPageSkeleton />} slug="fixture">
        <GeoPage />
      </GeoUpgradeGate>
    );

    expect(html).toContain("Upgrade required");
    expect(html).not.toContain("Protected page content");
    expect(GeoPage).not.toHaveBeenCalled();
  });
});
