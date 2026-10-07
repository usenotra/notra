import { expect, test } from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";
import { IntlProvider } from "use-intl";

import type { SiteContextValue } from "@/types/sites";

import messages from "../../../messages/en.json";
import { SiteContext } from "./site-context";
import { SitePreviewAccessControl } from "./site-preview-access-control";

test("the shared access trigger reflects saved access and never submits a settings form", () => {
  for (const [
    previewsEnabled,
    previewVisibility,
    previewPasswordSetAt,
    label,
  ] of [
    [true, "protected", null, "Team only"],
    [true, "protected", "2026-10-01T00:00:00Z", "Team or password"],
    [true, "public", null, "Anyone with the link"],
    [false, "public", null, "Previews off"],
  ] as const) {
    const context = {
      organizationId: "org",
      organizationSlug: "org",
      siteId: "site",
      liveDeployment: null,
      detail: {
        site: { previewsEnabled, previewVisibility, previewPasswordSetAt },
      },
    } as SiteContextValue;
    const html = renderToStaticMarkup(
      <IntlProvider locale="en" messages={messages} timeZone="UTC">
        <SiteContext.Provider value={context}>
          <form>
            <SitePreviewAccessControl />
          </form>
        </SiteContext.Provider>
      </IntlProvider>
    );
    expect(html).toContain(label);
    expect(html).toContain('type="button"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('data-slot="popover-backdrop"');
    expect(html).not.toContain('type="password"');
  }
});
