import { describe, expect, mock, test } from "bun:test";

import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { suggestionKeywordTotals } from "../src/utils/geo-prompt-suggestions";

const keywords = [
  { query: "market my ai tool", clicks: 0, impressions: 57, position: 8.7 },
  { query: "changelog tools", clicks: 2, impressions: 18, position: 5.3 },
];

function Pass({ children }: { children?: ReactNode }) {
  return <div>{children}</div>;
}

mock.module("@notra/ui/components/ui/sheet", () => ({
  Sheet: ({ children, open }: { children?: ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
  SheetContent: Pass,
  SheetDescription: Pass,
  SheetFooter: Pass,
  SheetHeader: Pass,
  SheetScrollArea: Pass,
  SheetTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
}));

const { PromptSuggestionSheet } =
  await import("../src/components/geo/prompt-suggestion-sheet");

describe("suggestionKeywordTotals", () => {
  test("sums impressions and clicks and keeps the best position", () => {
    expect(suggestionKeywordTotals(keywords)).toEqual({
      impressions: 75,
      clicks: 2,
      position: 5.3,
      ctr: (2 / 75) * 100,
    });
  });

  test("returns empty totals when there are no queries", () => {
    expect(suggestionKeywordTotals([])).toEqual({
      impressions: 0,
      clicks: 0,
      position: null,
      ctr: null,
    });
  });
});

describe("PromptSuggestionSheet", () => {
  test("shows the prompt, title, totals, and source queries", () => {
    const html = renderToStaticMarkup(
      <PromptSuggestionSheet
        onOpenChange={() => undefined}
        suggestion={{
          id: "suggestion-1",
          prompt:
            "how do i turn my developer tool's shipped work into marketing content without slowing down engineering",
          title: "Turn Shipped Work Into Marketing Content",
          source: "search_console",
          keywords,
          createdAt: "2026-09-22T00:00:00.000Z",
        }}
      />
    );

    expect(html).toContain("without slowing down engineering");
    expect(html).toContain("Turn Shipped Work Into Marketing Content");
    expect(html).toContain("75");
    expect(html).toContain("2.7%");
    expect(html).toContain("#5.3");
    expect(html).toContain("market my ai tool");
    expect(html).toContain("changelog tools");
  });
});
