import { expect, test } from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";
import { IntlProvider } from "use-intl";

import messages from "../../../messages/en.json";
import { WebBreakdownTable } from "./web-breakdown-table";

test("traffic rows display changes, not relative-size bars", () => {
  const html = renderToStaticMarkup(
    <IntlProvider locale="en" messages={messages} timeZone="UTC">
      <WebBreakdownTable
        nameHeader="Page"
        rows={[
          { key: "up", label: "/up", sortLabel: "/up", value: 5, previous: 4 },
          {
            key: "down",
            label: "/down",
            sortLabel: "/down",
            value: 3,
            previous: 6,
          },
          {
            key: "flat",
            label: "/flat",
            sortLabel: "/flat",
            value: 3,
            previous: 3,
          },
          {
            key: "new",
            label: "/new",
            sortLabel: "/new",
            value: 1,
            previous: 0,
          },
          {
            key: "unknown",
            label: "/unknown",
            sortLabel: "/unknown",
            value: 1,
          },
        ]}
        title="Top pages"
        valueHeader="Views"
      />
    </IntlProvider>
  );
  expect(html).toContain("25%");
  expect(html).toContain("50%");
  expect(html).toContain("0%");
  expect(html).toContain("New");
  expect(html).toContain(messages.geo.webVisitors.comparisonUnavailable);
  expect(html).not.toContain("w-14");
  expect(html).not.toContain("bg-primary/15");
});
