import { expect, test } from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";
import { IntlProvider } from "use-intl";

import type { SiteRecord } from "@/types/sites";

import messages from "../../../../messages/en.json";
import { SiteEditorConflictBanner } from "./site-editor-conflict-banner";
import { SiteEditorFileBar } from "./site-editor-file-bar";

test("the mobile file picker can shrink beside the editor actions", () => {
  const path = "blog/a-very-long-filename-that-must-truncate-on-mobile.mdx";
  const html = renderToStaticMarkup(
    <IntlProvider locale="en" messages={messages} timeZone="UTC">
      <SiteEditorFileBar
        document={null}
        hasDraft={false}
        isDiscarding={false}
        mode="edit"
        onDiscard={() => {}}
        onModeChange={() => {}}
        onOpenFilePicker={() => {}}
        path={path}
        saveState={{ status: "idle" }}
        site={{ repository: null, liveDeploymentId: null } as SiteRecord}
      />
    </IntlProvider>
  );
  const picker = html.match(/<button[^>]*aria-haspopup="dialog"[^>]*>/)?.[0];
  expect(picker).toBeDefined();
  expect(picker).toContain(`title="${path}"`);
  expect(picker).toContain("min-w-0 shrink md:hidden");
  const classes = picker?.match(/class="([^"]*)"/)?.[1].split(" ");
  expect(classes).not.toContain("shrink-0");
  expect(html).toContain('role="tablist"');
});

test("conflict paths inherit neutral foreground without recoloring the warning", () => {
  const html = renderToStaticMarkup(
    <IntlProvider locale="en" messages={messages} timeZone="UTC">
      <SiteEditorConflictBanner
        canRebase
        isRebasing={false}
        onDismiss={() => {}}
        onRebase={() => {}}
        onSelect={() => {}}
        paths={["blog/conflict.mdx"]}
      />
    </IntlProvider>
  );
  expect(html).toContain('role="alert"');
  expect(html).toContain("text-destructive");
  expect(html).toContain('<ul class="text-foreground');
  expect(html).toContain('title="blog/conflict.mdx"');
});
