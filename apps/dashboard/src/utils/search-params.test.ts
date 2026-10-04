import { describe, expect, test } from "bun:test";

import { parseSearch, stringifySearch } from "@/utils/search-params";

describe("search params", () => {
  test.each([
    "?mcpConnected=true",
    "?q=null",
    "?page=2&sort=-createdAt",
    "?tag=a&tag=b",
    "?q=%22quoted%22",
    "?q=a+b%26c",
  ])("%s round-trips unchanged", (searchStr) => {
    expect(stringifySearch(parseSearch(searchStr))).toBe(searchStr);
  });

  test("values stay strings", () => {
    expect(parseSearch("?a=true&b=null&c=1&d=")).toEqual({
      a: "true",
      b: "null",
      c: "1",
      d: "",
    });
  });

  test("written strings are not quoted", () => {
    expect(stringifySearch({ x: "1", y: "true", z: undefined })).toBe(
      "?x=1&y=true"
    );
  });
});
