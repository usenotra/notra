import { describe, expect, test } from "bun:test";

import type {
  GeoBrandSearchResult,
  GeoCompetitor,
} from "@notra/geo-core/types/geo";

import { competitorSearchItems } from "./onboarding-competitors";

const langchain: GeoBrandSearchResult = {
  domain: "langchain.com",
  logo: null,
  name: "LangChain",
};

function selectedCompetitor(
  name: string,
  domain: string | null
): GeoCompetitor {
  return {
    color: null,
    domain,
    id: name.toLowerCase(),
    kind: "direct",
    name,
    synonyms: [],
  };
}

function items(
  query: string,
  searchResults: readonly GeoBrandSearchResult[] = [],
  selected: readonly GeoCompetitor[] = [],
  ownDomain: string | null = "mastra.ai",
  searching = false
) {
  return competitorSearchItems({
    ownDomain,
    query,
    searchResults,
    searching,
    selected,
  });
}

describe("competitorSearchItems", () => {
  test("uses an exact provider result without adding a duplicate manual item", () => {
    expect(items("LangChain", [langchain])).toEqual([
      { ...langchain, source: "search" },
    ]);
  });

  test("offers manual entry when the provider returns no matches or fails", () => {
    expect(items("LangChain")).toEqual([
      {
        domain: null,
        logo: null,
        name: "LangChain",
        source: "manual",
      },
    ]);
  });

  test("does not offer the workspace's own domain", () => {
    expect(items("mastra.ai")).toEqual([]);
  });

  test("filters competitors that are already selected by domain", () => {
    expect(
      items(
        "LangChain",
        [langchain],
        [selectedCompetitor("LangChain", "langchain.com")]
      )
    ).toEqual([]);
  });

  test("filters a manual competitor that is already selected by name", () => {
    expect(
      items("LangChain", [], [selectedCompetitor("LangChain", null)])
    ).toEqual([]);
  });

  test("waits for the current request before offering manual entry", () => {
    expect(items("LangChain", [], [], "mastra.ai", true)).toEqual([]);
  });

  test("ignores queries below the minimum length", () => {
    expect(items("L")).toEqual([]);
  });
});
