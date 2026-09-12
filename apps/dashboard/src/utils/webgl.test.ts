import { expect, test } from "bun:test";

import { isWebGLAvailable } from "./webgl";

test("isWebGLAvailable is false when document is missing", () => {
  const previousDocument = globalThis.document;
  // @ts-expect-error document is removed to cover the SSR/no-DOM path
  delete globalThis.document;
  try {
    expect(isWebGLAvailable()).toBe(false);
  } finally {
    globalThis.document = previousDocument;
  }
});
