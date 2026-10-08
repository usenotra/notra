import { expect, test } from "bun:test";

import { GEO_EMPTY_TRAFFIC_RESPONSE } from "@notra/geo-core/constants/geo";
import { classifyVisitor } from "@notra/geo-core/ingest/classify-visitor";
import { renderToStaticMarkup } from "react-dom/server";
import { IntlProvider } from "use-intl";

import { groupTrafficSources } from "@/utils/ai-traffic-groups";

import messages from "../../../messages/en.json";
import { AiTrafficCard } from "./ai-traffic-card";
import { TrafficSourceGroupCell } from "./traffic-source-group-cell";

test("source cell counts current bots rather than retained comparison members", () => {
  const [group] = groupTrafficSources(
    ["GPTBot", "OAI-SearchBot"].map((agent, index) => ({
      ...classifyVisitor({
        userAgent: agent,
        referer: undefined,
        accept: undefined,
      }),
      visits: index === 0 ? 0 : 10,
      previousVisits: index === 0 ? 100 : 0,
      paths: index === 0 ? 0 : 1,
      markdownVisits: 0,
      lastSeenAt: "2026-10-07 12:00:00",
    }))
  );
  if (!group) {
    throw new Error("Expected OpenAI group");
  }
  const html = renderToStaticMarkup(
    <IntlProvider locale="en" messages={messages} timeZone="UTC">
      <TrafficSourceGroupCell group={group} />
    </IntlProvider>
  );
  expect(html).toContain("1 bot");
  expect(html).not.toContain("2 bots");
});

test("a card with only previous-period traffic renders No Data rather than historical bands", () => {
  const historical = {
    ...classifyVisitor({
      userAgent: "ChatGPT-User",
      referer: undefined,
      accept: undefined,
    }),
    visits: 0,
    previousVisits: 100,
    paths: 0,
    markdownVisits: 0,
    lastSeenAt: "1970-01-01 00:00:00",
  };
  const html = renderToStaticMarkup(
    <IntlProvider locale="en" messages={messages} timeZone="UTC">
      <AiTrafficCard
        pages={[]}
        settingsHref="/settings"
        traffic={{ ...GEO_EMPTY_TRAFFIC_RESPONSE, sources: [historical] }}
      />
    </IntlProvider>
  );
  expect(html).toContain(messages.geo.shared.noAiTrafficCapturedYet);
  expect(html).not.toContain(">Cited</span>");
  expect(html).not.toContain("OpenAI");
});
