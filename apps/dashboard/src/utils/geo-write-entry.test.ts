import { describe, expect, test } from "bun:test";

import { getGeoWriterDocumentState } from "./geo-write-entry";

describe("getGeoWriterDocumentState", () => {
  test("distinguishes a failed brief request from an initial load", () => {
    expect(getGeoWriterDocumentState(true, null, undefined)).toMatchObject({
      isBriefError: false,
      isChatLocked: true,
      isPlanMode: true,
    });

    expect(
      getGeoWriterDocumentState(
        true,
        new Error("Brief request failed"),
        undefined
      )
    ).toMatchObject({
      isBriefError: true,
      isChatLocked: true,
      isPlanMode: true,
    });
  });
});
