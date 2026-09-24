import { describe, expect, test } from "bun:test";

import { isFailedToolOutput } from "./chat-tool-output";

describe("isFailedToolOutput", () => {
  test("treats success false and isError as failures", () => {
    expect(isFailedToolOutput({ success: false, error: "missing key" })).toBe(
      true
    );
    expect(isFailedToolOutput({ isError: true })).toBe(true);
    expect(isFailedToolOutput({ success: true, results: [] })).toBe(false);
    expect(isFailedToolOutput(undefined)).toBe(false);
  });
});
