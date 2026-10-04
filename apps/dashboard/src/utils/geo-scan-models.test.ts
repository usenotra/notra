import { describe, expect, test } from "bun:test";

import type { GeoModelCatalogEntry } from "@notra/geo-core/types/geo";

import {
  buildScanModelOptions,
  defaultScanModelSelection,
} from "@/utils/geo-scan-models";

function model(
  id: string,
  label: string,
  zdr: GeoModelCatalogEntry["zdr"] = "all"
): GeoModelCatalogEntry {
  return {
    id,
    provider: "openai",
    label,
    zdr,
    released: "2026-01-01",
    default: false,
    gateways: [],
  };
}

const catalog = [
  model("openai/a", "Model A"),
  model("openai/b", "Model B", "none"),
  model("openai/c", "Model C"),
];

describe("buildScanModelOptions", () => {
  test("blocks models without a ZDR host when ZDR is enforced", () => {
    const options = buildScanModelOptions({
      tracked: ["openai/a", "openai/b"],
      catalog,
      enforceZdr: true,
    });
    expect(options.find((option) => option.id === "openai/b")?.zdrBlocked).toBe(
      true
    );
    expect([...defaultScanModelSelection(options)]).toEqual(["openai/a"]);
  });
});
