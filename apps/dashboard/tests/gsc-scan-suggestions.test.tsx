import { describe, expect, mock, test } from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";

import type { TableProps } from "../src/components/motion/table/types";
import { DESIGN_SYSTEM_SEARCH_GAPS } from "../src/constants/design-system-gaps";
import type { GeoPromptSuggestion } from "../src/types/geo";

let suggestions: GeoPromptSuggestion[] = [];
mock.module("@/lib/hooks/use-geo", () => ({
  useGeoSettings: mock(),
  useGeoStartScan: mock(),
  useGeoRescanPrompt: mock(),
  useIsGeoScanning: mock(),
  useGeoSuggestions: () => ({ data: { suggestions } }),
  useGscStatus: () => ({ data: undefined, isPending: true }),
  useGscCardDismissal: () => ({ dismissed: true, dismiss: mock() }),
  useGscAnalyzing: () => false,
  useGeoSuggestionAccept: () => ({ mutateAsync: mock(async () => undefined) }),
  useGeoSuggestionDismiss: () => ({ mutateAsync: mock(async () => undefined) }),
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
