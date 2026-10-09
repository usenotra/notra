import { expect, test } from "bun:test";

import { GEO_JOURNEY_BROWSE_CATEGORY } from "@notra/geo-core/constants/geo";
import type { GeoTrafficSource } from "@notra/geo-core/types/geo";
import type { TableColumn } from "@notra/ui/components/ui/data-table";
import { renderToStaticMarkup } from "react-dom/server";
import { IntlProvider } from "use-intl";

import type { GeoTrafficSourceGroup } from "@/types/geo";
import { groupTrafficSources } from "@/utils/ai-traffic-groups";

import messages from "../../../messages/en.json";
import { TrafficSourcesStack } from "./traffic-sources-group";

function source(category: string): GeoTrafficSource {
  return {
    source: "openai",
    visitorType: "crawler",
    agent: "GPTBot",
    category,
    confidence: "reported",
    visits: 1,
    markdownVisits: 0,
    paths: 1,
    lastSeenAt: "2026-10-07T10:00:00Z",
  };
}

function render(sources: GeoTrafficSource[]) {
  const columns: TableColumn<GeoTrafficSourceGroup>[] = [
    {
      key: "source",
      header: "Source",
      cell: (group) => group.label,
    },
  ];
  return renderToStaticMarkup(
    <IntlProvider locale="en" messages={messages} timeZone="UTC">
      <TrafficSourcesStack
        collapsed={new Set()}
        columns={columns}
        groups={groupTrafficSources(sources)}
        onOpen={() => {}}
        onToggle={() => {}}
      />
    </IntlProvider>
  );
}

test("the source stack omits Cited when no cited sources exist", () => {
  const html = render([source("training-crawler")]);
  expect(html).not.toContain(">Cited</span>");
  expect(html).toContain(">Crawlers</span>");
  expect(html).toContain(">Referrals</span>");
});

test("the source stack shows Cited again when cited sources exist", () => {
  const html = render([
    source("training-crawler"),
    source(GEO_JOURNEY_BROWSE_CATEGORY),
  ]);
  expect(html).toContain(">Cited</span>");
  expect(html).toContain("1 source");
});
