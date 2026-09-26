import { describe, expect, test } from "bun:test";

import { GEO_WRITER_TRIGGER_ID } from "@notra/geo-core/constants/geo";

import { parseGeoWriterDraft } from "../src/utils/geo-write-entry";

describe("GEO writer metadata project scope", () => {
  test("normalizes a padded project ID before it reaches project queries", () => {
    expect(
      parseGeoWriterDraft({
        triggerId: GEO_WRITER_TRIGGER_ID,
        briefId: "brief-1",
        projectId: "  project-1  ",
      })
    ).toEqual({ briefId: "brief-1", projectId: "project-1" });
  });

  test.each([undefined, "", "   "])(
    "keeps legacy metadata without a usable project ID unscoped (%p)",
    (projectId) => {
      expect(
        parseGeoWriterDraft({
          triggerId: GEO_WRITER_TRIGGER_ID,
          briefId: "brief-1",
          projectId,
        })
      ).toEqual({ briefId: "brief-1", projectId: undefined });
    }
  );
});
