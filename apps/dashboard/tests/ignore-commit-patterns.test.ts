import { beforeEach, describe, expect, mock, test } from "bun:test";

import { eventTriggerFormSchema } from "@notra/schemas/dashboard/automation/event-trigger-form";
import {
  eventTriggerSourceConfigSchema,
  isUnsafeIgnoreCommitPattern,
} from "@notra/schemas/shared/automation";

import type { GithubProcessedEvent } from "../src/types/webhooks/webhooks";
import {
  formatIgnoreCommitPatterns,
  parseIgnoreCommitPatternsText,
} from "../src/utils/event-trigger-form";
import {
  addIgnoreCommitPatternToText,
  buildIgnoreCommitPrefixPattern,
  compileIgnoreCommitPatterns,
  IGNORE_COMMIT_PATTERN_PRESET_PREFIXES,
  IGNORE_COMMIT_PATTERNS_PLACEHOLDER,
  isCommitMessageIgnored,
  isPushEventIgnoredByPatterns,
} from "../src/utils/ignore-commit-patterns";

// Mocked before the dispatch module below is imported, so no workflow
// runtime is touched: these tests only assert dispatch decisions.
const startEventRun = mock(async (_payload: unknown) => ({ runId: "run-1" }));
mock.module("@/lib/workflows/start", () => ({ startEventRun }));
const { dispatchEventTriggers } =
  await import("../src/lib/webhooks/dispatch-event-triggers");

function pushEvent(messages: unknown[]): GithubProcessedEvent {
  return {
    type: "push",
    action: "pushed",
    data: {
      commits: messages.map((message, index) => ({
        id: `sha-${index}`,
        message,
      })),
    },
  };
}

describe("compileIgnoreCommitPatterns", () => {
  test("compiles valid patterns and skips invalid ones", () => {
    const compiled = compileIgnoreCommitPatterns([
      IGNORE_COMMIT_PATTERNS_PLACEHOLDER,
      "(unclosed",
      42,
      "  ",
    ]);
    expect(compiled).toHaveLength(1);
    expect(compiled[0]?.test("chore: bump deps")).toBe(true);
  });

  test("returns empty for non-array input", () => {
    expect(compileIgnoreCommitPatterns(undefined)).toEqual([]);
    expect(compileIgnoreCommitPatterns("^chore")).toEqual([]);
  });

  test("trims and dedupes patterns", () => {
    const compiled = compileIgnoreCommitPatterns([
      "^chore",
      "  ^chore  ",
      "^fix",
    ]);
    expect(compiled).toHaveLength(2);
  });
});

describe("isCommitMessageIgnored", () => {
  const patterns = compileIgnoreCommitPatterns([
    IGNORE_COMMIT_PATTERNS_PLACEHOLDER,
  ]);

  test("ignores chore-style commit messages", () => {
    expect(isCommitMessageIgnored("chore: bump deps", patterns)).toBe(true);
    expect(isCommitMessageIgnored("chore(): rebuild", patterns)).toBe(true);
    expect(isCommitMessageIgnored("chore(deps): update", patterns)).toBe(true);
  });

  test("keeps feature commits", () => {
    expect(isCommitMessageIgnored("feat: add login", patterns)).toBe(false);
    expect(isCommitMessageIgnored("fix: crash on load", patterns)).toBe(false);
  });

  test("never ignores without patterns or message", () => {
    expect(isCommitMessageIgnored("chore: bump", [])).toBe(false);
    expect(isCommitMessageIgnored(undefined, patterns)).toBe(false);
  });
});

describe("isPushEventIgnoredByPatterns", () => {
  const patterns = [IGNORE_COMMIT_PATTERNS_PLACEHOLDER];

  test("ignores pushes where every commit matches", () => {
    expect(
      isPushEventIgnoredByPatterns(
        pushEvent(["chore: bump deps", "chore(ci): tweak"]),
        patterns
      )
    ).toBe(true);
  });

  test("keeps pushes with at least one real change", () => {
    expect(
      isPushEventIgnoredByPatterns(
        pushEvent(["chore: bump deps", "feat: add login"]),
        patterns
      )
    ).toBe(false);
  });

  test("never ignores non-push events, empty commits, or missing patterns", () => {
    expect(
      isPushEventIgnoredByPatterns(
        { type: "release", action: "published", data: {} },
        patterns
      )
    ).toBe(false);
    expect(isPushEventIgnoredByPatterns(pushEvent([]), patterns)).toBe(false);
    expect(isPushEventIgnoredByPatterns(pushEvent(["chore: bump"]), [])).toBe(
      false
    );
    expect(
      isPushEventIgnoredByPatterns(pushEvent(["chore: bump"]), ["(unclosed"])
    ).toBe(false);
  });
});

describe("parseIgnoreCommitPatternsText", () => {
  test("parses one pattern per line, trimming and deduping", () => {
    expect(
      parseIgnoreCommitPatternsText("^chore(\\(|:)\n\n  ^chore(\\(|:)  \n^wip")
    ).toEqual(["^chore(\\(|:)", "^wip"]);
  });

  test("drops invalid regexes and returns empty for blank input", () => {
    expect(parseIgnoreCommitPatternsText("(unclosed\n^fix")).toEqual(["^fix"]);
    expect(parseIgnoreCommitPatternsText("")).toEqual([]);
    expect(parseIgnoreCommitPatternsText(undefined)).toEqual([]);
  });

  test("round-trips through formatIgnoreCommitPatterns", () => {
    const patterns = ["^chore(\\(|:)", "^wip:"];
    expect(
      parseIgnoreCommitPatternsText(formatIgnoreCommitPatterns(patterns))
    ).toEqual(patterns);
    expect(formatIgnoreCommitPatterns(undefined)).toBe("");
  });

  test("drops ReDoS-prone patterns", () => {
    expect(parseIgnoreCommitPatternsText("(a+)+$\n^fix")).toEqual(["^fix"]);
  });
});

describe("dispatchEventTriggers fail-closed event-type matching", () => {
  const push = pushEvent(["feat: add login"]);

  beforeEach(() => {
    startEventRun.mockClear();
  });

  test("does not start runs for triggers with missing eventTypes", async () => {
    await dispatchEventTriggers({
      triggers: [{ id: "trigger-1", sourceConfig: {} }],
      processedEvent: push,
      repositoryId: "repo-1",
    });
    expect(startEventRun).not.toHaveBeenCalled();
  });

  test("does not start runs for triggers with empty eventTypes", async () => {
    await dispatchEventTriggers({
      triggers: [{ id: "trigger-1", sourceConfig: { eventTypes: [] } }],
      processedEvent: push,
      repositoryId: "repo-1",
    });
    expect(startEventRun).not.toHaveBeenCalled();
  });

  test("does not start runs for triggers with invalid eventTypes", async () => {
    await dispatchEventTriggers({
      triggers: [
        { id: "trigger-1", sourceConfig: { eventTypes: ["bogus"] } },
        { id: "trigger-2", sourceConfig: null },
      ],
      processedEvent: push,
      repositoryId: "repo-1",
    });
    expect(startEventRun).not.toHaveBeenCalled();
  });

  test("does not start runs for non-matching event types", async () => {
    await dispatchEventTriggers({
      triggers: [
        { id: "trigger-1", sourceConfig: { eventTypes: ["release"] } },
      ],
      processedEvent: push,
      repositoryId: "repo-1",
    });
    expect(startEventRun).not.toHaveBeenCalled();
  });

  test("starts runs for matching event types", async () => {
    await dispatchEventTriggers({
      triggers: [{ id: "trigger-1", sourceConfig: { eventTypes: ["push"] } }],
      processedEvent: push,
      repositoryId: "repo-1",
    });
    expect(startEventRun).toHaveBeenCalledTimes(1);
  });
});

describe("isUnsafeIgnoreCommitPattern", () => {
  test("flags nested quantifiers", () => {
    expect(isUnsafeIgnoreCommitPattern("(a+)+$")).toBe(true);
    expect(isUnsafeIgnoreCommitPattern("(a+)*")).toBe(true);
    expect(isUnsafeIgnoreCommitPattern("(ab{2,3}){2}")).toBe(true);
    expect(isUnsafeIgnoreCommitPattern("(a?)?")).toBe(true);
  });

  test("flags quantified groups nested in quantified groups", () => {
    expect(isUnsafeIgnoreCommitPattern("^((a+))*$")).toBe(true);
    expect(isUnsafeIgnoreCommitPattern("(x(a)+y)*")).toBe(true);
    expect(isUnsafeIgnoreCommitPattern("((ab))*")).toBe(false);
    expect(isUnsafeIgnoreCommitPattern("((a+)b)")).toBe(false);
  });

  test("flags lookarounds and backreferences", () => {
    expect(isUnsafeIgnoreCommitPattern("(?=.*a)b")).toBe(true);
    expect(isUnsafeIgnoreCommitPattern("a(?!b)")).toBe(true);
    expect(isUnsafeIgnoreCommitPattern("(?<=a)b")).toBe(true);
    expect(isUnsafeIgnoreCommitPattern("(?<!a)b")).toBe(true);
    expect(isUnsafeIgnoreCommitPattern("(a)\\1")).toBe(true);
  });

  test("allows ordinary patterns", () => {
    for (const pattern of [
      "^chore(\\(|:)",
      "^wip",
      "fix:.*",
      "(?:chore|wip):",
      "(?<name>chore):",
      "[+*] brackets",
      "a\\+b",
      "a{2}",
      "\\d+\\.\\d+",
    ]) {
      expect(isUnsafeIgnoreCommitPattern(pattern)).toBe(false);
    }
  });
});

describe("compileIgnoreCommitPatterns safety", () => {
  test("skips ReDoS-prone patterns", () => {
    const compiled = compileIgnoreCommitPatterns(["(a+)+$", "^chore"]);
    expect(compiled).toHaveLength(1);
    expect(compiled[0]?.test("chore: bump")).toBe(true);
  });
});

describe("ignore-commit-pattern presets", () => {
  test("builds anchored prefix patterns matching colon and paren forms", () => {
    expect(buildIgnoreCommitPrefixPattern("chore")).toBe("^chore(\\(|:)");
    for (const prefix of IGNORE_COMMIT_PATTERN_PRESET_PREFIXES) {
      const compiled = compileIgnoreCommitPatterns([
        buildIgnoreCommitPrefixPattern(prefix),
      ]);
      expect(compiled).toHaveLength(1);
      expect(isCommitMessageIgnored(`${prefix}: bump`, compiled)).toBe(true);
      expect(isCommitMessageIgnored(`${prefix}(scope): bump`, compiled)).toBe(
        true
      );
      expect(isCommitMessageIgnored(`feat: bump`, compiled)).toBe(false);
    }
  });

  test("appends presets without dupes and respects the pattern cap", () => {
    expect(addIgnoreCommitPatternToText("", "^chore(\\(|:)")).toBe(
      "^chore(\\(|:)"
    );
    expect(addIgnoreCommitPatternToText("^chore(\\(|:)", "^chore(\\(|:)")).toBe(
      "^chore(\\(|:)"
    );
    const full = Array.from({ length: 10 }, (_, index) => `^p${index}`).join(
      "\n"
    );
    expect(addIgnoreCommitPatternToText(full, "^overflow")).toBe(full);
  });
});

describe("eventTriggerSourceConfigSchema pattern validation", () => {
  test("rejects unsafe and multi-line patterns", () => {
    expect(
      eventTriggerSourceConfigSchema.safeParse({
        eventTypes: ["push"],
        ignoreCommitPatterns: ["(a+)+$"],
      }).success
    ).toBe(false);
    expect(
      eventTriggerSourceConfigSchema.safeParse({
        eventTypes: ["push"],
        ignoreCommitPatterns: ["foo\nbar"],
      }).success
    ).toBe(false);
    expect(
      eventTriggerSourceConfigSchema.safeParse({
        eventTypes: ["push"],
        ignoreCommitPatterns: ["^chore"],
      }).success
    ).toBe(true);
  });
});

describe("eventTriggerFormSchema patterns gating", () => {
  const base = {
    eventType: "release",
    outputType: "changelog",
    repositoryIds: ["repo-1"],
    brandVoiceId: "",
    autoPublish: false,
    includePreReleases: true,
    ignoreCommitPatternsText: "(unclosed",
  } as const;

  test("ignores invalid patterns text for release triggers", () => {
    expect(eventTriggerFormSchema.safeParse(base).success).toBe(true);
  });

  test("rejects invalid patterns text for push triggers", () => {
    expect(
      eventTriggerFormSchema.safeParse({ ...base, eventType: "push" }).success
    ).toBe(false);
  });

  test("rejects unsafe patterns text for push triggers", () => {
    expect(
      eventTriggerFormSchema.safeParse({
        ...base,
        eventType: "push",
        ignoreCommitPatternsText: "(a+)+$",
      }).success
    ).toBe(false);
  });

  test("ignores over-long patterns text for release triggers", () => {
    expect(
      eventTriggerFormSchema.safeParse({
        ...base,
        ignoreCommitPatternsText: "x".repeat(2000),
      }).success
    ).toBe(true);
  });

  test("rejects over-long patterns text for push triggers", () => {
    expect(
      eventTriggerFormSchema.safeParse({
        ...base,
        eventType: "push",
        ignoreCommitPatternsText: "x".repeat(2000),
      }).success
    ).toBe(false);
  });
});
