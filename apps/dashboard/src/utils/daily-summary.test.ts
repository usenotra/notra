import { expect, test } from "bun:test";

import {
  buildDailySummaryHeadline,
  formatDailySummaryChangeDetail,
  groupDailySummaryItems,
  truncatePrompt,
} from "@/utils/daily-summary";

function state(mentioned: boolean, position: number | null) {
  return { mentioned, position };
}

test("describes mention changes with the rank", () => {
  expect(
    formatDailySummaryChangeDetail({
      kind: "gained_mention",
      previous: state(false, null),
      current: state(true, 2),
      competitors: [],
    })
  ).toBe("Now mentioned at #2");
  expect(
    formatDailySummaryChangeDetail({
      kind: "lost_mention",
      previous: state(true, 3),
      current: state(false, null),
      competitors: [],
    })
  ).toBe("No longer mentioned (was #3)");
  expect(
    formatDailySummaryChangeDetail({
      kind: "position_improved",
      previous: state(true, 4),
      current: state(true, 1),
      competitors: [],
    })
  ).toBe("Moved up from #4 to #1");
});

test("names the competitors behind a displacement", () => {
  expect(
    formatDailySummaryChangeDetail({
      kind: "competitor_displaced",
      previous: state(true, 1),
      current: state(false, null),
      competitors: ["Rival", "Other", "Third"],
    })
  ).toBe("Replaced by Rival, Other +1");
  expect(
    formatDailySummaryChangeDetail({
      kind: "competitor_displaced",
      previous: state(true, 1),
      current: state(true, 3),
      competitors: ["Rival"],
    })
  ).toBe("Pushed down from #1 to #3 by Rival");
});

test("headline counts answers, not prompts", () => {
  expect(
    buildDailySummaryHeadline({ gained: 2, lost: 1, positionDropped: 0 })
  ).toBe("You showed up in 2 new AI answers but dropped out of 1.");
  expect(
    buildDailySummaryHeadline({ gained: 0, lost: 1, positionDropped: 0 })
  ).toBe("You dropped out of 1 AI answer yesterday.");
  expect(
    buildDailySummaryHeadline({ gained: 0, lost: 0, positionDropped: 2 })
  ).toBe("Competitors pushed you down in 2 AI answers yesterday.");
});

test("groups changes for the same prompt and engine", () => {
  const grouped = groupDailySummaryItems([
    {
      id: "prompt-1:anthropic",
      title: "Which transcription app should I use?",
      changes: [
        { id: "citation_added", detail: "Your site is now cited", tone: "up" },
      ],
      engineLabel: "Claude",
    },
    {
      id: "prompt-1:anthropic",
      title: "Which transcription app should I use?",
      changes: [
        {
          id: "citation_removed",
          detail: "Your site is no longer cited",
          tone: "down",
        },
      ],
      engineLabel: "Claude",
    },
  ]);

  expect(grouped).toEqual([
    {
      id: "prompt-1:anthropic",
      title: "Which transcription app should I use?",
      changes: [
        { id: "citation_added", detail: "Your site is now cited", tone: "up" },
        {
          id: "citation_removed",
          detail: "Your site is no longer cited",
          tone: "down",
        },
      ],
      engineLabel: "Claude",
    },
  ]);
});

test("keeps distinct prompt ids when display titles match", () => {
  const prefix = "a".repeat(80);
  const firstTitle = truncatePrompt(`${prefix} first`, 80);
  const secondTitle = truncatePrompt(`${prefix} second`, 80);
  const grouped = groupDailySummaryItems([
    {
      id: "prompt-1:anthropic",
      title: firstTitle,
      changes: [{ id: "gained_mention", detail: "Now mentioned", tone: "up" }],
      engineLabel: "Claude",
    },
    {
      id: "prompt-2:anthropic",
      title: secondTitle,
      changes: [
        { id: "lost_mention", detail: "No longer mentioned", tone: "down" },
      ],
      engineLabel: "Claude",
    },
  ]);

  expect(firstTitle).toBe(secondTitle);
  expect(grouped).toHaveLength(2);
  expect(grouped.map((item) => item.id)).toEqual([
    "prompt-1:anthropic",
    "prompt-2:anthropic",
  ]);
});
