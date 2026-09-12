import { describe, expect, test } from "bun:test";

import type { GeoTrafficPage } from "@notra/geo-core/types/geo";

import {
  filterTrafficPageGroups,
  filterTrafficPageGroupsByHost,
  groupTrafficPages,
  trafficHostSelectOptions,
  trafficHostsFromPages,
} from "../src/utils/ai-traffic-pages";

function page(
  overrides: Pick<GeoTrafficPage, "host" | "path"> & Partial<GeoTrafficPage>
): GeoTrafficPage {
  return {
    source: "openai",
    visitorType: "crawler",
    visits: 1,
    lastSeenAt: "2026-09-11 00:00:00",
    ...overrides,
  };
}

describe("groupTrafficPages", () => {
  test("keeps the same path on two hosts as separate rows", () => {
    const groups = groupTrafficPages([
      page({ host: "example.com", path: "/blog", visits: 3 }),
      page({ host: "docs.example.com", path: "/blog", visits: 2 }),
      page({
        host: "example.com",
        path: "/blog",
        source: "perplexity",
        visits: 1,
      }),
    ]);

    expect(groups).toHaveLength(2);
    const marketing = groups.find((group) => group.host === "example.com");
    const docs = groups.find((group) => group.host === "docs.example.com");
    expect(marketing?.visits).toBe(4);
    expect(marketing?.sources).toHaveLength(2);
    expect(docs?.visits).toBe(2);
  });
});

describe("filterTrafficPageGroups", () => {
  test("matches host or path", () => {
    const groups = groupTrafficPages([
      page({ host: "docs.example.com", path: "/pricing" }),
      page({ host: "example.com", path: "/blog" }),
    ]);

    expect(filterTrafficPageGroups(groups, "docs")).toHaveLength(1);
    expect(filterTrafficPageGroups(groups, "/blog")).toHaveLength(1);
  });
});

describe("filterTrafficPageGroupsByHost", () => {
  test("includes subdomains of the selected host", () => {
    const groups = groupTrafficPages([
      page({ host: "example.com", path: "/" }),
      page({ host: "docs.example.com", path: "/" }),
      page({ host: "other.com", path: "/" }),
    ]);

    expect(filterTrafficPageGroupsByHost(groups, "example.com")).toHaveLength(
      2
    );
    expect(
      filterTrafficPageGroupsByHost(groups, "www.example.com")
    ).toHaveLength(2);
    const docs = filterTrafficPageGroupsByHost(groups, "docs.example.com");
    expect(docs).toHaveLength(1);
    expect(docs[0]?.host).toBe("docs.example.com");
    expect(filterTrafficPageGroupsByHost(groups, "")).toHaveLength(3);
  });
});

describe("trafficHostsFromPages", () => {
  test("returns sorted unique hosts", () => {
    expect(
      trafficHostsFromPages([
        page({ host: "docs.example.com", path: "/" }),
        page({ host: "example.com", path: "/" }),
        page({ host: "docs.example.com", path: "/blog" }),
        page({ host: "", path: "/" }),
      ])
    ).toEqual(["docs.example.com", "example.com"]);
  });
});

describe("trafficHostSelectOptions", () => {
  test("does not add a second all option", () => {
    expect(
      trafficHostSelectOptions(["example.com", "docs.example.com"], "all")
    ).toEqual(["docs.example.com", "example.com"]);
  });

  test("keeps a selected host that is missing from the current page set", () => {
    expect(
      trafficHostSelectOptions(["docs.example.com"], "example.com")
    ).toEqual(["docs.example.com", "example.com"]);
  });
});
