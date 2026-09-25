import { describe, expect, test } from "bun:test";

import { getGeoWriterDocumentState } from "./geo-write-entry";

describe("getGeoWriterDocumentState", () => {
  test("distinguishes a failed brief request from an initial load", () => {
    expect(
      getGeoWriterDocumentState(true, null, undefined, false)
    ).toMatchObject({
      isBriefError: false,
      isChatLocked: true,
      isPlanMode: true,
    });

    expect(
      getGeoWriterDocumentState(
        true,
        new Error("Brief request failed"),
        undefined,
        false
      )
    ).toMatchObject({
      isBriefError: true,
      isChatLocked: true,
      isPlanMode: true,
    });
  });

  test("keeps a completed brief in plan mode while the post is still the plan", () => {
    expect(
      getGeoWriterDocumentState(true, null, "completed", true)
    ).toMatchObject({ isPlanMode: true });
    expect(
      getGeoWriterDocumentState(true, null, "completed", false)
    ).toMatchObject({ isPlanMode: false });
  });
});
