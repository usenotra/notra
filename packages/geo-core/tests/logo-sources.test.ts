import { expect, test } from "bun:test";

import { competitorLogoSources } from "../src/geo/logo";

test("competitor logos use the Google favicon when a domain is known", () => {
  expect(competitorLogoSources("wisprflow.ai", null)).toEqual([
    "https://www.google.com/s2/favicons?domain=wisprflow.ai&sz=128",
  ]);
});

test("an explicit logo stays ahead of the Google favicon", () => {
  expect(
    competitorLogoSources("wisprflow.ai", "https://cdn.example/logo.png")
  ).toEqual([
    "https://cdn.example/logo.png",
    "https://www.google.com/s2/favicons?domain=wisprflow.ai&sz=128",
  ]);
});
