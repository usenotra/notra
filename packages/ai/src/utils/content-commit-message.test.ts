import { expect, mock, test } from "bun:test";

const generateText = mock(async () => ({
  output: { headline: '"Shorten the intro"' },
}));

mock.module("ai", () => ({
  generateText,
  Output: { object: (value: unknown) => value },
}));
mock.module("@notra/ai/gateway", () => ({
  gateway: () => ({}),
}));

const {
  fallbackContentCommitHeadline,
  generateContentCommitHeadline,
  sanitizeContentCommitHeadline,
} = await import("./content-commit-message");

test("first commits add the title, follow-ups update it", () => {
  expect(fallbackContentCommitHeadline("Release notes", false)).toBe(
    "docs: add Release notes"
  );
  expect(fallbackContentCommitHeadline("Release notes", true)).toBe(
    "docs: update Release notes"
  );
  expect(fallbackContentCommitHeadline("Release\n notes", true)).toBe(
    "docs: update Release notes"
  );
});

test("sanitizes model output into a conventional headline", () => {
  expect(
    sanitizeContentCommitHeadline(
      '"Shorten the intro"\nlonger body',
      "docs: update Release"
    )
  ).toBe("docs: Shorten the intro");
  expect(
    sanitizeContentCommitHeadline("docs: drop the pricing table", "fallback")
  ).toBe("docs: drop the pricing table");
  expect(sanitizeContentCommitHeadline("   ", "docs: update Release")).toBe(
    "docs: update Release"
  );
});

test("generates a follow-up headline and falls back when the model fails", async () => {
  expect(
    await generateContentCommitHeadline({
      organizationId: "org",
      title: "Release",
      previousMarkdown: "# Old intro",
      nextMarkdown: "# Short intro",
      fallback: "docs: update Release",
    })
  ).toBe("docs: Shorten the intro");

  expect(
    await generateContentCommitHeadline({
      organizationId: "org",
      title: "Release",
      previousMarkdown: "# Same",
      nextMarkdown: "# Same",
      fallback: "docs: update Release",
    })
  ).toBe("docs: update Release");
  expect(generateText).toHaveBeenCalledTimes(1);

  generateText.mockImplementationOnce(async () => {
    throw new Error("gateway down");
  });
  expect(
    await generateContentCommitHeadline({
      organizationId: "org",
      title: "Release",
      previousMarkdown: "# Old",
      nextMarkdown: "# New",
      fallback: "docs: update Release",
    })
  ).toBe("docs: update Release");
});
