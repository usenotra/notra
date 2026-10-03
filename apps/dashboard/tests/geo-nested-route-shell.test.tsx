import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { renderToStaticMarkup } from "react-dom/server";

import GeoCompetitorDetailLoading from "../src/app/(dashboard)/[slug]/geo/competitors/[competitor]/loading";
import { GeoCompetitorsSkeleton } from "../src/app/(dashboard)/[slug]/geo/competitors/skeleton";
import GeoGapsLoading from "../src/app/(dashboard)/[slug]/geo/gaps/loading";

const OVERVIEW_SKELETON_COPY = "How AI engines talk about your brand";

describe("GEO nested route shells", () => {
  test("native gaps route selects its own pending component", () => {
    const source = readFileSync(
      new URL("../src/routes/-geo-ui.tsx", import.meta.url),
      "utf8"
    );
    expect(source).toMatch(
      /path: "gaps",[\s\S]*?pendingComponent: GapsLoading/
    );
  });

  test("content gaps loading shell is the gaps skeleton, not GEO overview", () => {
    const html = renderToStaticMarkup(<GeoGapsLoading />);
    expect(html).toContain("Content Gaps");
    expect(html).toContain('aria-live="polite" class="sr-only"');
    expect(html).toContain("Calculating gaps from the latest scan.");
    expect(html).not.toContain(OVERVIEW_SKELETON_COPY);
    expect(html).not.toContain(">GEO<");
  });

  test("competitors skeleton is the competitors page, not GEO overview", () => {
    const html = renderToStaticMarkup(<GeoCompetitorsSkeleton />);
    expect(html).toContain("Competitors");
    expect(html).toContain("Who AI engines recommend instead of you");
    expect(html).not.toContain(OVERVIEW_SKELETON_COPY);
    expect(html).not.toContain(">GEO<");
  });

  test("competitor detail loading is the detail skeleton, not the competitors list", () => {
    const html = renderToStaticMarkup(<GeoCompetitorDetailLoading />);
    expect(html).toContain("Mentions over time");
    expect(html).not.toContain("Who AI engines recommend instead of you");
    expect(html).not.toContain(OVERVIEW_SKELETON_COPY);
    expect(html).not.toContain(">GEO<");
  });
});
