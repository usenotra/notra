import { describe, expect, it } from "bun:test";

import { mergeThreeWay } from "./three-way-merge";

const LABELS = { mine: "Your version", theirs: "Notra v4" };

describe("mergeThreeWay", () => {
  it("merges disjoint edits without conflicts", () => {
    const result = mergeThreeWay({
      base: "one\ntwo\nthree",
      mine: "one changed\ntwo\nthree",
      theirs: "one\ntwo\nthree changed",
      labels: LABELS,
    });

    expect(result.hasConflicts).toBe(false);
    expect(result.conflictCount).toBe(0);
    expect(result.text).toBe("one changed\ntwo\nthree changed");
  });

  it("treats an identical edit on both sides as a false conflict", () => {
    const result = mergeThreeWay({
      base: "one\ntwo\nthree",
      mine: "one\ntwo edited\nthree",
      theirs: "one\ntwo edited\nthree",
      labels: LABELS,
    });

    expect(result.hasConflicts).toBe(false);
    expect(result.conflictCount).toBe(0);
    expect(result.text).toBe("one\ntwo edited\nthree");
  });

  it("marks a line both sides changed differently", () => {
    const result = mergeThreeWay({
      base: "one\ntwo\nthree",
      mine: "one\nmine wins\nthree",
      theirs: "one\ntheirs wins\nthree",
      labels: LABELS,
    });

    expect(result.hasConflicts).toBe(true);
    expect(result.conflictCount).toBe(1);
    expect(result.text).toBe(
      [
        "one",
        "<<<<<<< Your version",
        "mine wins",
        "=======",
        "theirs wins",
        ">>>>>>> Notra v4",
        "three",
      ].join("\n")
    );
  });

  it("counts every conflicting region", () => {
    const result = mergeThreeWay({
      base: "a\nb\nc\nd\ne",
      mine: "a1\nb\nc\nd\ne1",
      theirs: "a2\nb\nc\nd\ne2",
      labels: LABELS,
    });

    expect(result.conflictCount).toBe(2);
  });

  it("keeps markdown whitespace byte-identical outside the edits", () => {
    const base = [
      "# Humanizer",
      "",
      "Write like a person, not a press release.",
      "",
      "## Rules",
      "",
      "- Keep sentences short.",
      "- Avoid filler words.",
      "",
    ].join("\n");
    const mine = base.replace("- Keep sentences short.", "- Keep it short.");
    const theirs = base.replace(
      "Write like a person, not a press release.",
      "Write like a person."
    );

    const result = mergeThreeWay({ base, mine, theirs, labels: LABELS });

    expect(result.hasConflicts).toBe(false);
    expect(result.text).toBe(
      [
        "# Humanizer",
        "",
        "Write like a person.",
        "",
        "## Rules",
        "",
        "- Keep it short.",
        "- Avoid filler words.",
        "",
      ].join("\n")
    );
  });

  it("preserves CRLF line endings", () => {
    const base = "one\r\ntwo\r\nthree";
    const result = mergeThreeWay({
      base,
      mine: "one\r\ntwo mine\r\nthree",
      theirs: base,
      labels: LABELS,
    });

    expect(result.text).toBe("one\r\ntwo mine\r\nthree");
  });

  it("returns the text unchanged when nothing differs", () => {
    const text = "one\ntwo\nthree";
    const result = mergeThreeWay({
      base: text,
      mine: text,
      theirs: text,
      labels: LABELS,
    });

    expect(result.hasConflicts).toBe(false);
    expect(result.conflictCount).toBe(0);
    expect(result.text).toBe(text);
  });
});
