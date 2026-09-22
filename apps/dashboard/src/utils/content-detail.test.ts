import { describe, expect, test } from "bun:test";

import { getContentSaveLabel } from "./content-detail";

describe("getContentSaveLabel", () => {
  test("keeps save local unless a pull request update is in flight", () => {
    expect(
      getContentSaveLabel({ isSaving: false, updatePullRequest: false })
    ).toBe("Save changes");
    expect(
      getContentSaveLabel({ isSaving: true, updatePullRequest: false })
    ).toBe("Saving…");
    expect(
      getContentSaveLabel({ isSaving: true, updatePullRequest: true })
    ).toBe("Updating PR…");
  });
});
