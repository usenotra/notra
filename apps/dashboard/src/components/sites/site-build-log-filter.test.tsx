import { expect, test } from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";
import { IntlProvider } from "use-intl";

import messages from "../../../messages/en.json";
import { SiteBuildLogFilter } from "./site-build-log-filter";

test.each(["", "error"])(
  "the log filter uses the shared input group and only offers clearing for a query: %s",
  (value) => {
    const html = renderToStaticMarkup(
      <IntlProvider locale="en" messages={messages} timeZone="UTC">
        <SiteBuildLogFilter onChange={() => {}} value={value} />
      </IntlProvider>
    );
    const labels = messages.sites.deploymentPage.log;
    expect(html).toContain('data-slot="input-group"');
    expect(html).toContain('data-slot="input-group-control"');
    expect(html).toContain(`aria-label="${labels.filter}"`);
    expect(html).toContain(`value="${value}"`);
    expect(html).not.toContain("<label");
    if (value) {
      expect(html).toContain('data-slot="button"');
      expect(html).toContain(`aria-label="${labels.clearFilter}"`);
      expect(html).toContain('type="button"');
      const addon = html.match(/<div[^>]*data-align="inline-end"[^>]*>/)?.[0];
      expect(addon).toContain("has-[&gt;button]:py-0");
    } else {
      expect(html).not.toContain("<button");
    }
  }
);
