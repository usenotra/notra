import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { isSiteEditorUnsaved } from "../src/utils/site-editor";

test("pending, failed, and discarding files block publishing", () => {
  for (const status of ["dirty", "saving", "error", "discarding"] as const) {
    expect(isSiteEditorUnsaved({ status })).toBe(true);
  }
  expect(isSiteEditorUnsaved({ status: "idle" })).toBe(false);
  expect(isSiteEditorUnsaved({ status: "saved" })).toBe(false);
});

test("file switching does not reset the page's pending-save state", () => {
  const page = readFileSync(
    resolve(
      import.meta.dirname,
      "../src/components/sites/pages/site-editor-page.tsx"
    ),
    "utf8"
  );
  const openFile = page.slice(
    page.indexOf("const openFile ="),
    page.indexOf("const fileDiagnostics =")
  );
  expect(openFile).not.toContain("setSaveState");
  expect(openFile).not.toContain("saves.reset");
  expect(page).toContain("const unsaved = saves.unsaved");
  expect(page).toContain("saveQueue={saves.getQueue(selectedPath)}");
  const pane = readFileSync(
    resolve(
      import.meta.dirname,
      "../src/components/sites/editor/site-editor-pane.tsx"
    ),
    "utf8"
  );
  expect(pane).toContain("void saveQueue.flush()");
  expect(pane).not.toContain("saveDraft.call");
  expect(pane).toContain("const revision = saved.revision");
});

test("visitor collection has no toggle in either traffic state", () => {
  const page = readFileSync(
    resolve(
      import.meta.dirname,
      "../src/app/(dashboard)/[slug]/geo/traffic/page-client.tsx"
    ),
    "utf8"
  );
  const emptyState = page.slice(
    page.indexOf("if (isEmptyTraffic)"),
    page.indexOf("<AiTrafficCard")
  );
  const emptyReturn = emptyState.slice(0, emptyState.indexOf("\n  return ("));
  expect(emptyReturn).toContain("<TrafficEmpty");
  expect(emptyReturn).toContain("{header}");
  expect(page).not.toContain("VisitorTrackingToggle");
  expect(page).toContain("const showVisitors = hasWebAnalytics(web)");
});

test("source details use filtered pages while the domain picker keeps its full inventory", () => {
  const page = readFileSync(
    resolve(
      import.meta.dirname,
      "../src/app/(dashboard)/[slug]/geo/traffic/page-client.tsx"
    ),
    "utf8"
  );
  const sourceCard = page.slice(
    page.indexOf("<AiTrafficCard"),
    page.indexOf("<TrafficPagesCard")
  );
  expect(sourceCard).toContain("pages={trafficPages}");
  expect(sourceCard).not.toContain("inventoryPages");
  expect(page).toContain(
    "trafficHostsFromPages(inventoryPages.data?.pages ?? [])"
  );
});

test("an empty current window with prior traffic does not recommend reinstalling tracking", () => {
  const page = readFileSync(
    resolve(
      import.meta.dirname,
      "../src/app/(dashboard)/[slug]/geo/traffic/page-client.tsx"
    ),
    "utf8"
  );
  expect(page).toContain("!sources.some((source) => source.visits > 0)");
  const empty = page.slice(
    page.indexOf("if (isEmptyTraffic)"),
    page.indexOf("<AiTrafficCard")
  );
  expect(empty).toContain("const hasPreviousTraffic");
  expect(empty).toContain("source.previousVisits");
  expect(empty).toContain("web?.totals.previousViews");
  expect(empty).toContain('title={t("emptyRangeTitle")}');
  expect(empty).toContain("<TrafficEmpty setup={ingestSetup}");
});

test("an already-open publish dialog blocks submission while any file has unsaved writes", () => {
  const dialog = readFileSync(
    resolve(
      import.meta.dirname,
      "../src/components/sites/site-publish-dialog.tsx"
    ),
    "utf8"
  );
  expect(dialog).toContain("draftCount > 0");
  expect(dialog).toContain("!unsaved");
  expect(dialog).toContain(
    "disabled={!trimmed || draftCount === 0 || unsaved}"
  );
  const page = readFileSync(
    resolve(
      import.meta.dirname,
      "../src/components/sites/pages/site-editor-page.tsx"
    ),
    "utf8"
  );
  const publishDialog = page.slice(
    page.indexOf("<SitePublishDialog"),
    page.indexOf("<SiteNewFileDialog")
  );
  expect(publishDialog).toContain("unsaved={unsaved}");
});

test("rebasing waits for saved files and freezes the editor independently of its loading state", () => {
  const page = readFileSync(
    resolve(
      import.meta.dirname,
      "../src/components/sites/pages/site-editor-page.tsx"
    ),
    "utf8"
  );
  const banner = readFileSync(
    resolve(
      import.meta.dirname,
      "../src/components/sites/editor/site-editor-conflict-banner.tsx"
    ),
    "utf8"
  );
  expect(page).toContain("canRebase={!unsaved && !rebaseMutation.isPending}");
  expect(page).toContain("if (!unsaved && !rebaseMutation.isPending)");
  expect(page).toContain("inert={rebaseMutation.isPending}");
  expect(banner).toContain("disabled={!canRebase}");
  expect(banner).toContain("loading={isRebasing}");
  expect(page).toMatch(
    /key=\{`\$\{organizationId\}:\$\{siteId\}:\$\{selectedPath\}:\$\{editorEpoch\}`\}/
  );
});
