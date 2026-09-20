import { describe, expect, test } from "bun:test";

import {
  buildGitHubMentionSuggestions,
  commentableLinesFromPatch,
  fitGitHubMentionSuggestionsToRange,
  formatGitHubMentionSuggestionBlock,
  formatGitHubMentionSuggestionDiff,
  isGitHubMentionSuggestionCommentable,
} from "@notra/ai/utils/github-mention-suggestion";

const PATH = "docs/getting-started.md";
const PREVIOUS = [
  "# Getting started",
  "",
  "Install the Acme CLI with `npm i -g acme`.",
  "",
  "## See also",
  "",
  "- [Release 2.4 changelog](/changelog/release-2-4)",
  "",
  "## Support",
  "",
  "Write to us.",
  "",
].join("\n");

function applySuggestions(
  previous: string,
  suggestions: ReturnType<typeof buildGitHubMentionSuggestions>
) {
  const lines = previous.split("\n");
  for (const suggestion of [...suggestions].reverse()) {
    lines.splice(
      suggestion.startLine - 1,
      suggestion.line - suggestion.startLine + 1,
      ...suggestion.replacement
    );
  }
  return lines.join("\n");
}

describe("buildGitHubMentionSuggestions", () => {
  test("replaces a reworked region with one suggestion", () => {
    const next = PREVIOUS.replace(
      "## See also\n\n- [Release 2.4 changelog](/changelog/release-2-4)",
      "See the [Release 2.4 changelog](/changelog/release-2-4) for what's new."
    );
    const suggestions = buildGitHubMentionSuggestions({
      path: PATH,
      previous: PREVIOUS,
      next,
    });
    expect(suggestions).toEqual([
      {
        path: PATH,
        startLine: 5,
        line: 7,
        previousLines: [
          "## See also",
          "",
          "- [Release 2.4 changelog](/changelog/release-2-4)",
        ],
        replacement: [
          "See the [Release 2.4 changelog](/changelog/release-2-4) for what's new.",
        ],
      },
    ]);
    expect(applySuggestions(PREVIOUS, suggestions)).toBe(next);
  });

  test("keeps distant edits as separate suggestions", () => {
    const next = PREVIOUS.replace("# Getting started", "# Start here").replace(
      "Write to us.",
      "Write to support@acme.dev."
    );
    const suggestions = buildGitHubMentionSuggestions({
      path: PATH,
      previous: PREVIOUS,
      next,
    });
    expect(suggestions.map(({ startLine, line }) => [startLine, line])).toEqual(
      [
        [1, 1],
        [11, 11],
      ]
    );
    expect(applySuggestions(PREVIOUS, suggestions)).toBe(next);
  });

  test("turns a removed block into an empty replacement", () => {
    const next = PREVIOUS.replace("\n\n## Support\n\nWrite to us.", "");
    const suggestions = buildGitHubMentionSuggestions({
      path: PATH,
      previous: PREVIOUS,
      next,
    });
    expect(applySuggestions(PREVIOUS, suggestions)).toBe(next);
  });
});

describe("fitGitHubMentionSuggestionsToRange", () => {
  test("widens the change to the lines of the review thread", () => {
    const next = PREVIOUS.replace("## See also", "## Related");
    const suggestions = buildGitHubMentionSuggestions({
      path: PATH,
      previous: PREVIOUS,
      next,
    });
    const fitted = fitGitHubMentionSuggestionsToRange({
      suggestions,
      previous: PREVIOUS,
      range: { startLine: 5, line: 7 },
    });
    expect(fitted?.replacement).toEqual([
      "## Related",
      "",
      "- [Release 2.4 changelog](/changelog/release-2-4)",
    ]);
  });

  test("gives up when a change falls outside the thread", () => {
    const suggestions = buildGitHubMentionSuggestions({
      path: PATH,
      previous: PREVIOUS,
      next: PREVIOUS.replace("Write to us.", "Write to support."),
    });
    expect(
      fitGitHubMentionSuggestionsToRange({
        suggestions,
        previous: PREVIOUS,
        range: { startLine: 5, line: 7 },
      })
    ).toBeNull();
  });
});

describe("commentable lines", () => {
  const patch = [
    "@@ -1,3 +1,4 @@",
    " # Getting started",
    " ",
    "-Install the CLI.",
    "+Install the Acme CLI.",
    "+",
    "@@ -20,2 +21,2 @@",
    " ## Support",
    "-Write.",
    "+Write to us.",
    "\\ No newline at end of file",
  ].join("\n");

  test("covers added and context lines of every hunk", () => {
    expect([...commentableLinesFromPatch(patch)]).toEqual([1, 2, 3, 4, 21, 22]);
    expect(commentableLinesFromPatch(null).size).toBe(0);
  });
});
