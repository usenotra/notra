import { describe, expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { renderToStaticMarkup } from "react-dom/server";

import type { TableProps } from "../src/components/motion/table/types";
import { DESIGN_SYSTEM_SEARCH_GAPS } from "../src/constants/design-system-gaps";
import type { GeoPromptSuggestion } from "../src/types/geo";

function SuggestionsTable({
  data,
}: Pick<TableProps<GeoPromptSuggestion>, "data">) {
  return (
    <div>
      {data.map((row) => (
        <p key={row.id}>{row.prompt}</p>
      ))}
    </div>
  );
}

if (process.env.NOTRA_GSC_SCAN_SUGGESTIONS_TEST !== "1") {
  test("Search Console suggestions with isolated module mocks", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        env: { ...process.env, NOTRA_GSC_SCAN_SUGGESTIONS_TEST: "1" },
        timeout: 15_000,
      }
    );
    expect(result.status, result.stderr.toString()).toBe(0);
  }, 20_000);
} else {
  let suggestions: GeoPromptSuggestion[] = [];
  mock.module("@/lib/hooks/use-geo", () => ({
    useGeoSuggestions: () => ({ data: { suggestions } }),
    useGscStatus: () => ({ data: undefined, isPending: true }),
    useGscCardDismissal: () => ({ dismissed: true, dismiss: mock() }),
    useGscAnalyzing: () => false,
    useGeoSuggestionAccept: () => ({
      mutateAsync: mock(async () => undefined),
    }),
    useGeoSuggestionDismiss: () => ({
      mutateAsync: mock(async () => undefined),
    }),
  }));
  mock.module("@/lib/hooks/use-gsc-connection-toast", () => ({
    useGscConnectionToast: () => false,
  }));
  mock.module("@/components/geo/search-console-card", () => ({
    SearchConsoleToolbar: () => null,
  }));
  mock.module("@/components/geo/prompt-suggestion-sheet", () => ({
    PromptSuggestionSheet: () => null,
  }));
  mock.module("@/components/motion/table", () => ({ Table: SuggestionsTable }));
  const { PromptSuggestions } =
    await import("../src/components/geo/prompt-suggestions");

  describe("Search Console suggestion card", () => {
    test("only scan suggestions do not make the GSC-specific card appear", () => {
      suggestions = DESIGN_SYSTEM_SEARCH_GAPS.filter(
        (row) => row.source === "scan"
      ).map((row) => ({
        ...row,
        keywords: row.queries,
        createdAt: "2026-09-25T08:30:00.000Z",
      }));
      expect(
        renderToStaticMarkup(
          <PromptSuggestions
            organizationId="fixture"
            callbackPath="/fixture/geo/prompts"
          />
        )
      ).toBe("");
    });
    test("mixed suggestions render only GSC rows in the card", () => {
      suggestions = DESIGN_SYSTEM_SEARCH_GAPS.map((row) => ({
        ...row,
        keywords: row.queries,
        createdAt: "2026-09-25T08:30:00.000Z",
      }));
      const html = renderToStaticMarkup(
        <PromptSuggestions
          organizationId="fixture"
          callbackPath="/fixture/geo/prompts"
        />
      );
      for (const row of suggestions) {
        if (row.source === "scan") {
          expect(html).not.toContain(row.prompt);
        } else {
          expect(html).toContain(row.prompt);
        }
      }
      expect(html).toContain("Track all");
    });
  });
}
