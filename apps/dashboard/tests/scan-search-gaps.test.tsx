import { describe, expect, mock, test } from "bun:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import type { PropsWithChildren } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  DESIGN_SYSTEM_SEARCH_GAP,
  DESIGN_SYSTEM_SEARCH_GAPS,
} from "../src/constants/design-system-gaps";
import { filterSearchGaps } from "../src/utils/geo-gaps";
import { writeDialogStateFromSearchGap } from "../src/utils/geo-write-entry";

// Keep the real detail content; replace only portal/layout infrastructure for SSR.
function Container({ children }: PropsWithChildren) {
  return <div>{children}</div>;
}
if (process.env.NOTRA_SCAN_SEARCH_GAPS_TEST !== "1") {
  test("scan Search Gaps with isolated module mocks", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: { ...process.env, NOTRA_SCAN_SEARCH_GAPS_TEST: "1" },
        timeout: 15_000,
      }
    );
    expect(result.status, result.stderr.toString()).toBe(0);
  }, 20_000);
} else {
  mock.module("@notra/ui/components/ui/sheet", () => ({
    Sheet: Container,
    SheetContent: Container,
    SheetDescription: Container,
    SheetFooter: Container,
    SheetHeader: Container,
    SheetScrollArea: Container,
    SheetTitle: Container,
  }));
  mock.module("@/components/motion/table", () => ({
    Table: () => <div>Query metrics table</div>,
  }));
  const { SearchGapDetailSheet } =
    await import("../src/components/geo/search-gap-detail");

  describe("scan Search Gaps UI", () => {
    test("shows inspectable scan provenance without Google performance metrics", () => {
      const row = DESIGN_SYSTEM_SEARCH_GAPS.find(
        (gap) => gap.source === "scan"
      );
      assert.ok(row);
      const html = renderToStaticMarkup(
        <SearchGapDetailSheet row={row} onOpenChange={() => undefined} />
      );
      expect(html).toContain("AI scan");
      expect(html).toContain("Observed research queries");
      expect(html).toContain(row.prompt);
      expect(html).toContain(row.scanEvidence[0]?.prompt ?? "missing origin");
      expect(html).toContain("openai/gpt-5");
      expect(html).toContain('dateTime="2026-09-25T08:30:00.000Z"');
      expect(html).toContain("demo-scan");
      expect(html).toContain("do not measure user demand");
      expect(html).not.toContain("Search performance");
      expect(html).not.toContain("Query metrics table");
      expect(html).not.toContain("Impressions");
    });

    test("preserves GSC performance details and source-aware writer inputs", () => {
      const html = renderToStaticMarkup(
        <SearchGapDetailSheet
          row={DESIGN_SYSTEM_SEARCH_GAP}
          onOpenChange={() => undefined}
        />
      );
      expect(html).toContain("Google Search Console");
      expect(html).toContain("Search performance");
      expect(html).toContain("Impressions");
      expect(html).toContain("Query metrics table");
      expect(html).not.toContain("Observed research queries");
      for (const row of DESIGN_SYSTEM_SEARCH_GAPS) {
        expect(
          writeDialogStateFromSearchGap(row, "https://example.com/update")
        ).toEqual({
          sourceKind: row.source,
          sourceId: row.id,
          topic: row.prompt,
          existingPageUrl: "https://example.com/update",
        });
      }
    });

    test("keeps source-neutral server order and search filtering", () => {
      expect(filterSearchGaps(DESIGN_SYSTEM_SEARCH_GAPS, "")[0]?.source).toBe(
        "scan"
      );
      expect(
        filterSearchGaps(
          DESIGN_SYSTEM_SEARCH_GAPS,
          "connection pooling comparison"
        ).map((row) => row.id)
      ).toEqual(["demo-scan-gap"]);
    });
  });
}
