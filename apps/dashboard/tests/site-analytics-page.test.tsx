import { beforeEach, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { GEO_EMPTY_TRAFFIC_RESPONSE } from "@notra/geo-core/constants/geo";
import type { SiteAnalyticsResponse } from "@notra/geo-core/types/geo";
import { renderToStaticMarkup } from "react-dom/server";
import { IntlProvider } from "use-intl";

import messages from "../messages/en.json";

if (!process.env.NOTRA_SITE_ANALYTICS_TEST_WORKER) {
  test("site analytics empty-state contract", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: { ...process.env, NOTRA_SITE_ANALYTICS_TEST_WORKER: "1" },
        timeout: 30_000,
      }
    );
    expect(result.status, result.stderr?.toString()).toBe(0);
  });
} else {
  let analyticsOn = true;
  let published = true;
  let isError = false;
  let data: SiteAnalyticsResponse | undefined;

  mock.module("../src/components/sites/site-context", () => ({
    useSite: () => ({
      organizationId: "org-test",
      organizationSlug: "test",
      siteId: "site-test",
      detail: { site: { analyticsEnabled: analyticsOn } },
      liveDeployment: published ? { id: "deployment-test" } : null,
    }),
  }));
  mock.module("../src/lib/hooks/use-sites", () => ({
    useSiteAnalytics: () => ({ data, isError }),
  }));
  mock.module("../src/lib/hooks/use-geo-range", () => ({
    useGeoRange: () => ({
      preset: "30d",
      range: { dateFrom: "2026-09-10", dateTo: "2026-10-09" },
      query: { from: "2026-09-10", to: "2026-10-09" },
    }),
  }));
  mock.module("../src/components/framework/link", () => ({ default: "a" }));

  const { SiteAnalyticsPage } =
    await import("../src/components/sites/pages/site-analytics-page");

  beforeEach(() => {
    analyticsOn = true;
    published = true;
    isError = false;
    data = {
      web: {
        configured: true,
        hosts: [],
        totals: {
          views: 0,
          previousViews: 0,
          visitors: 0,
          previousVisitors: 0,
          sessions: 0,
          previousSessions: 0,
          engagedSessions: 0,
          aiVisitors: 0,
          previousAiVisitors: 0,
        },
        points: [],
        pages: [],
        sources: [],
        countries: [],
        devices: [],
        outcomes: [],
      },
      traffic: GEO_EMPTY_TRAFFIC_RESPONSE,
      engagement: { views: 0, avgSeconds: 0, previousAvgSeconds: 0, pages: [] },
    };
  });

  const renderPage = () =>
    renderToStaticMarkup(
      <IntlProvider locale="en" messages={messages} timeZone="UTC">
        <SiteAnalyticsPage />
      </IntlProvider>
    );

  test.each(["new", "unpublished", "empty range"])(
    "%s sites retain the chart and table-local empty states",
    (state) => {
      if (state === "unpublished") {
        published = false;
      }
      if (state === "empty range" && data) {
        data.web.totals.previousViews = 10;
      }
      const html = renderPage();
      for (const key of [
        "trendTitle",
        "topPages",
        "referrers",
        "countries",
        "devices",
        "outcomesTitle",
      ] as const) {
        expect(html).toContain(messages.geo.webVisitors[key]);
      }
      expect(html.split(messages.geo.webVisitors.noData)).toHaveLength(6);
      expect(html.split('data-slot="empty"')).toHaveLength(6);
      expect(html.split('data-slot="empty-media"')).toHaveLength(6);
      expect(
        html.split(messages.geo.webVisitors.noDataDescription)
      ).toHaveLength(6);
      expect(html).not.toContain(messages.sites.analyticsPage.emptyTitle);
      expect(html).not.toContain(messages.sites.analyticsPage.emptyRangeTitle);
      expect(html).not.toContain(
        messages.sites.analyticsPage.notPublishedTitle
      );
    }
  );

  test("disabled analytics still offers the settings action", () => {
    analyticsOn = false;
    const html = renderPage();
    expect(html).toContain(messages.sites.analyticsPage.offTitle);
    expect(html).toContain(messages.sites.analyticsPage.offAction);
    expect(html).not.toContain(messages.geo.webVisitors.trendTitle);
  });

  test("loading and failed requests do not masquerade as zero visits", () => {
    data = undefined;
    expect(renderPage()).not.toContain(messages.geo.webVisitors.trendTitle);
    isError = true;
    const html = renderPage();
    expect(html).toContain(
      renderToStaticMarkup(<>{messages.sites.analyticsPage.errorTitle}</>)
    );
    expect(html).not.toContain(messages.geo.webVisitors.trendTitle);
  });
}
