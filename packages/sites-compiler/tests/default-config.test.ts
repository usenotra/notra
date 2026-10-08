import { describe, expect, test } from "bun:test";

import { createDefaultSiteConfig } from "@notra/sites-core/utils/default-config";

import { validateSite } from "../src/validate";

describe("default config snapshots", () => {
  test("validates and stages frozen values without changing source or snapshot", () => {
    const defaultConfig = createDefaultSiteConfig("Frozen name");
    defaultConfig.colors.primary = "#123456";
    defaultConfig.appearance = { default: "dark", strict: true };
    defaultConfig.security.contentSecurityPolicy = false;
    const snapshot = JSON.stringify(defaultConfig);
    const files = new Map<string, string | null>();
    const result = validateSite({ files, defaultConfig });

    expect(result.ok).toBe(true);
    expect(result.entries).toEqual([]);
    expect(result.config).toMatchObject(defaultConfig);
    expect(result.outputs.get("blog.json")).toBe(JSON.stringify(result.config));
    expect(files.size).toBe(0);
    expect(JSON.stringify(defaultConfig)).toBe(snapshot);
  });

  test("existing config takes precedence even over an invalid fallback", () => {
    const defaultConfig = createDefaultSiteConfig("Frozen name");
    defaultConfig.name = "";
    const files = new Map([["blog.json", '{"name":"Repository name"}']]);
    const result = validateSite({ files, defaultConfig });

    expect(result.ok).toBe(true);
    expect(result.config?.name).toBe("Repository name");
    expect(result.outputs.has("blog.json")).toBe(false);
    expect(files.get("blog.json")).toBe('{"name":"Repository name"}');
  });

  test("existing malformed, null and unreadable configs never fall back", () => {
    for (const raw of ["{", "null", '{"name":""}', null]) {
      const result = validateSite({
        files: new Map([["blog.json", raw]]),
        defaultConfig: createDefaultSiteConfig("Frozen name"),
      });

      expect(result.ok).toBe(false);
      expect(result.config).toBeNull();
      expect(result.outputs.has("blog.json")).toBe(false);
      expect(result.diagnostics.some((item) => item.severity === "error")).toBe(
        true
      );
    }
  });

  test("invalid fallback is rejected and legacy missing config remains an error", () => {
    const defaultConfig = createDefaultSiteConfig("Frozen name");
    defaultConfig.name = "";
    const invalid = validateSite({ files: new Map(), defaultConfig });
    expect(invalid.ok).toBe(false);
    expect(
      invalid.diagnostics.some((item) => item.code === "config_invalid")
    ).toBe(true);
    expect(invalid.outputs.has("blog.json")).toBe(false);

    const missing = validateSite({ files: new Map() });
    expect(missing.ok).toBe(false);
    expect(missing.diagnostics.map((item) => item.code)).toContain(
      "config_missing"
    );
  });
});
