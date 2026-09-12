import { expect, mock, test } from "bun:test";

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

test("isWebGLAvailable checks webgl2 only", () => {
  const previousDocument = globalThis.document;
  const getContext = mock((type: string) =>
    type === "webgl2" ? ({} as WebGL2RenderingContext) : null
  );
  globalThis.document = {
    createElement: () => ({ getContext }),
  } as unknown as Document;
  try {
    expect(isWebGLAvailable()).toBe(true);
    expect(getContext).toHaveBeenCalledWith("webgl2");
    expect(getContext).not.toHaveBeenCalledWith("webgl");
  } finally {
    globalThis.document = previousDocument;
  }
});
