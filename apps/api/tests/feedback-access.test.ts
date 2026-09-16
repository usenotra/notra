import { describe, expect, test } from "bun:test";

import { isFeedbackApiRequest } from "../src/utils/feedback";

describe("feedback access", () => {
  test("only feedback paths bypass the subscription gate", () => {
    for (const path of ["/v1/feedback", "/v1/feedback/", "/v1/feedback/item"]) {
      expect(isFeedbackApiRequest(path)).toBe(true);
    }
    for (const path of ["/v1/feedback-other", "/v1/posts", "/v2/feedback"]) {
      expect(isFeedbackApiRequest(path)).toBe(false);
    }
  });
});
