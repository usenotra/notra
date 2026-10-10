import { describe, expect, test } from "bun:test";

import {
  patchSiteVariables,
  readSiteVariablesConfig,
  siteVariablesFromRows,
} from "../src/utils/site-variables";

describe("site variables settings", () => {
  test("updates variables without losing other config or draft edits", () => {
    const content = JSON.stringify({
      name: "Acme",
      variables: { old: "before" },
      integrations: { plausible: { domain: "acme.com" } },
      custom: { future: true },
    });
    const updated = patchSiteVariables(content, [
      { id: "1", name: " product_name ", value: "Acme Flow" },
      { id: "2", name: "signup_url", value: "https://acme.com/signup" },
    ]);
    expect(JSON.parse(updated)).toEqual({
      name: "Acme",
      variables: {
        product_name: "Acme Flow",
        signup_url: "https://acme.com/signup",
      },
      integrations: { plausible: { domain: "acme.com" } },
      custom: { future: true },
    });
    expect(JSON.parse(content).variables).toEqual({ old: "before" });
    expect(JSON.parse(patchSiteVariables(updated, [])).variables).toEqual({});
  });

  test("rejects malformed config instead of overwriting it", () => {
    for (const content of ["{", "null", "[]", '{"variables":{"key":42}}']) {
      expect(() => readSiteVariablesConfig(content)).toThrow();
    }
    expect(readSiteVariablesConfig('{"name":"Acme"}').variables).toEqual({});
  });

  test("validates names, lengths, duplicates and preserves empty values", () => {
    expect(
      siteVariablesFromRows([{ id: "1", name: "empty", value: "" }])
    ).toEqual({ empty: "" });
    expect(() =>
      siteVariablesFromRows([
        { id: "1", name: "same", value: "a" },
        { id: "2", name: " same ", value: "b" },
      ])
    ).toThrow("duplicate");
    for (const name of ["", "1bad", "has space", "a".repeat(41)]) {
      expect(() =>
        siteVariablesFromRows([{ id: "1", name, value: "a" }])
      ).toThrow();
    }
    expect(() =>
      siteVariablesFromRows([{ id: "1", name: "ok", value: "a".repeat(501) }])
    ).toThrow();
    expect(
      siteVariablesFromRows([{ id: "1", name: "constructor", value: "safe" }])
    ).toEqual({ constructor: "safe" });
  });
});
