import { describe, expect, test } from "bun:test";

import { splitReasoningText } from "./split-reasoning-text";

describe("splitReasoningText", () => {
  test("keeps a long single line in the body", () => {
    const text =
      "I should match their writing style with emojis and then draft the Muse connector post without losing any of this.";
    const { title, body } = splitReasoningText(text);

    expect(title.endsWith("…")).toBe(true);
    expect(title.length).toBe(88);
    expect(body).toBe(text);
  });

  test("keeps markdown in the body when the first line is formatted", () => {
    const text = "# Plan\n- draft the post\n- keep the voice";
    expect(splitReasoningText(text).body).toBe(text);
  });

  test("uses a short plain first line as the title", () => {
    expect(splitReasoningText("Planning the draft.\nThen write it.")).toEqual({
      title: "Planning the draft.",
      body: "Then write it.",
    });
  });
});
