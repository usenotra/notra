import { beforeEach, describe, expect, mock, test } from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";

const geoFeature = mock(() => ({
  hasGeo: false,
  isLocked: false,
  isLoading: true,
}));
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
  geoFeature.mockReturnValue({
    hasGeo: false,
    isLocked: false,
    isLoading: true,
  });
  GeoPage.mockClear();
});

describe("GEO billing gate", () => {
  test("does not mount paid queries or show a paywall for an unknown customer", () => {
    geoFeature.mockReturnValue({
      hasGeo: false,
      isLocked: false,
      isLoading: false,
    });
    const html = renderToStaticMarkup(
      <GeoUpgradeGate slug="fixture">
        <GeoPage />
      </GeoUpgradeGate>
    );
    expect(GeoPage).not.toHaveBeenCalled();
    expect(html).not.toContain("Upgrade required");
  });
  test("does not mount paid queries while billing loads", () => {
    const html = renderToStaticMarkup(
      <GeoUpgradeGate slug="fixture">
        <GeoPage />
      </GeoUpgradeGate>
    );

    expect(html).not.toContain("Protected page content");
    expect(html).not.toContain("How AI engines talk about your brand");
    expect(html).not.toContain("Upgrade required");
    expect(GeoPage).not.toHaveBeenCalled();
  });

  test("renders the page for a confirmed entitled customer", () => {
    geoFeature.mockReturnValue({
      hasGeo: true,
      isLocked: false,
      isLoading: false,
    });
    const html = renderToStaticMarkup(
      <GeoUpgradeGate slug="fixture">
        <GeoPage />
      </GeoUpgradeGate>
    );

    expect(html).toContain("Protected page content");
    expect(html).not.toContain("Upgrade required");
    expect(GeoPage).toHaveBeenCalledTimes(1);
  });

  test("keeps the paywall and excludes page children for a confirmed locked customer", () => {
    geoFeature.mockReturnValue({
      hasGeo: false,
      isLocked: true,
      isLoading: false,
    });
    const html = renderToStaticMarkup(
      <GeoUpgradeGate slug="fixture">
        <GeoPage />
      </GeoUpgradeGate>
    );

    expect(html).toContain("Upgrade required");
    expect(html).not.toContain("Protected page content");
    expect(GeoPage).not.toHaveBeenCalled();
  });
});
