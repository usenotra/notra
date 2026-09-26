/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import {
  getOfferingCheckBrandFeatureIdentity,
  getOfferingCheckCacheIdentity,
} from "./offering-check";

describe("offering check identities", () => {
  const first = {
    domain: "example.com",
    feature: "AI   Search",
    description: "The original description",
  };
  const differentDescription = {
    domain: "EXAMPLE.COM",
    feature: " ai search ",
    description: "A different description",
  };

  test("rate-limits by normalized brand and feature", () => {
    expect(getOfferingCheckBrandFeatureIdentity(differentDescription)).toBe(
      getOfferingCheckBrandFeatureIdentity(first)
    );
    expect(
      getOfferingCheckBrandFeatureIdentity({
        ...first,
        feature: "AI Writer",
      })
    ).not.toBe(getOfferingCheckBrandFeatureIdentity(first));
  });

  test("caches different descriptions separately", () => {
    expect(getOfferingCheckCacheIdentity(differentDescription)).not.toBe(
      getOfferingCheckCacheIdentity(first)
    );
    expect(
      getOfferingCheckCacheIdentity({
        domain: "EXAMPLE.COM",
        feature: " ai search ",
        description: " the original   description ",
      })
    ).toBe(getOfferingCheckCacheIdentity(first));
  });
});
