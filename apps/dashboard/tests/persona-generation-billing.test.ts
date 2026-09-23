import { describe, expect, test } from "bun:test";

import { Data } from "effect";

import { creditsExhaustedMessage } from "../src/workflows/steps/persona-generation-steps";

class GeoWriterCreditsExhaustedError extends Data.TaggedError(
  "GeoWriterCreditsExhaustedError"
)<{ readonly message: string }> {}

describe("persona generation billing denial", () => {
  test("reads the tagged credit error Effect.runPromise rejects with", () => {
    const error = new GeoWriterCreditsExhaustedError({
      message: "Your plan needs AI credits",
    });
    expect(creditsExhaustedMessage(error)).toBe("Your plan needs AI credits");
  });

  test("leaves other failures to the generic message", () => {
    expect(creditsExhaustedMessage(new Error("network"))).toBeNull();
    expect(
      creditsExhaustedMessage("GeoWriterCreditsExhaustedError")
    ).toBeNull();
  });
});
