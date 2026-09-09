import { beforeEach, describe, expect, mock, test } from "bun:test";

import type { GeoPromptHistoryCheck } from "@notra/geo-core/types/geo";
import type { QueryStatus } from "@tanstack/react-query";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { PromptAnswerSelectionInput } from "../src/types/geo-prompt-detail";
import {
  promptAnswerRow,
  scopedAnswer,
} from "./constants/prompt-answer-selection";

let status: QueryStatus = "pending";
let checks: GeoPromptHistoryCheck[] | undefined;
const retryHistory = mock(async () => {});
const retryDetail = mock(async () => {});
const detailQuery = mock(
  (_organizationId: string, _checkId: string | null) => ({
    data: undefined,
    isError: false,
    refetch: retryDetail,
  })
);

mock.module("../src/lib/hooks/use-geo", () => ({
  useGeoPromptHistory: () => ({
    status,
    isError: status === "error",
    data: checks ? { checks } : undefined,
    refetch: retryHistory,
  }),
  useGeoPromptResultDetail: detailQuery,
}));
const { usePromptAnswerSelection } =
  await import("../src/lib/hooks/use-prompt-answer-selection");

function SelectionProbe(props: PromptAnswerSelectionInput) {
  const selection = usePromptAnswerSelection(props);
  return createElement(
    "output",
    null,
    JSON.stringify({
      state: selection.detailState.status,
      checkId: selection.active?.checkId ?? null,
      language: selection.selectedLanguage,
    })
  );
}

beforeEach(() => {
  status = "pending";
  checks = undefined;
  detailQuery.mockClear();
  retryHistory.mockClear();
  retryDetail.mockClear();
});

describe("scan-scoped prompt answer selection", () => {
  test.each(["pending", "error"] as const)(
    "does not fetch an unscoped answer when history is %s",
    (nextStatus) => {
      status = nextStatus;
      const html = renderToStaticMarkup(
        createElement(SelectionProbe, {
          row: promptAnswerRow,
          organizationId: "org",
          open: true,
          scanId: "selected-scan",
        })
      );
      expect(detailQuery).toHaveBeenLastCalledWith("org", null);
      expect(html).toContain(nextStatus === "pending" ? "loading" : "error");
      expect(html).not.toContain("unscoped-latest-answer");
    }
  );

  test("uses only the selected scan, engine, and language after history loads", () => {
    status = "success";
    checks = [
      { ...scopedAnswer, id: "other-scan", scanId: "other-scan" },
      { ...scopedAnswer, id: "english", language: "English" },
      { ...scopedAnswer, id: "other-engine", engine: "openai/gpt-4o-mini" },
      scopedAnswer,
    ];
    const html = renderToStaticMarkup(
      createElement(SelectionProbe, {
        row: promptAnswerRow,
        organizationId: "org",
        open: true,
        scanId: "selected-scan",
        initialEngine: scopedAnswer.engine,
        initialLanguage: "German",
      })
    );
    expect(detailQuery).toHaveBeenLastCalledWith("org", "scoped-answer");
    expect(html).toContain("German");
  });

  test("ordinary prompt history retains its latest-summary fallback", () => {
    status = "error";
    renderToStaticMarkup(
      createElement(SelectionProbe, {
        row: promptAnswerRow,
        organizationId: "org",
        open: true,
      })
    );
    expect(detailQuery).toHaveBeenLastCalledWith(
      "org",
      "unscoped-latest-answer"
    );
  });

  test("an empty scoped history stays empty instead of using the latest answer", () => {
    status = "success";
    checks = [];
    const html = renderToStaticMarkup(
      createElement(SelectionProbe, {
        row: promptAnswerRow,
        organizationId: "org",
        open: true,
        scanId: "selected-scan",
      })
    );
    expect(detailQuery).toHaveBeenLastCalledWith("org", null);
    expect(html).toContain("missing");
  });
});
