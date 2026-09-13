import { describe, expect, test } from "bun:test";

import { createPostGenerationRequestSchema } from "@notra/schemas/api/content";

describe("createPostGenerationRequestSchema timezone", () => {
  test("accepts valid IANA timezones", () => {
    expect(
      createPostGenerationRequestSchema.safeParse({
        contentType: "blog_post",
        timezone: "America/New_York",
      }).success
    ).toBe(true);
  });

  test("rejects invalid timezones", () => {
    const result = createPostGenerationRequestSchema.safeParse({
      contentType: "blog_post",
      timezone: "Not/A_Timezone",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (issue) => issue.message === "Invalid timezone"
        )
      ).toBe(true);
    }
  });
});
