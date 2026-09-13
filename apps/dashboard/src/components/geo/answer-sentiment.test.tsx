import { expect, test } from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";

import { AnswerSentiment } from "./answer-sentiment";

test("exact excerpts remain readable regardless of mention or rating", () => {
  const result = {
    mentioned: true,
    sentiment: "positive",
    answer: "Setup is quick.",
    excerpt: "Setup is quick.",
  };
  expect(renderToStaticMarkup(<AnswerSentiment result={result} />)).toContain(
    "<mark"
  );
  for (const saved of [
    { ...result, mentioned: false },
    { ...result, sentiment: null },
    { ...result, sentiment: "unknown" },
  ]) {
    expect(renderToStaticMarkup(<AnswerSentiment result={saved} />)).toContain(
      "<mark"
    );
  }
  expect(
    renderToStaticMarkup(
      <AnswerSentiment result={{ ...result, excerpt: "setup is quick." }} />
    )
  ).not.toContain("<mark");
});

test("exact excerpts remain available in full", () => {
  const excerpt =
    "First line.\nSecond line.\nThird line with the qualification.";
  const html = renderToStaticMarkup(
    <AnswerSentiment
      result={{
        mentioned: true,
        sentiment: "negative",
        answer: excerpt,
        excerpt,
      }}
    />
  );
  expect(html).toContain(excerpt);
  expect(html).not.toContain("line-clamp");
});
