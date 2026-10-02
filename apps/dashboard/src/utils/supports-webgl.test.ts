import { expect, mock, test } from "bun:test";

import { supportsWebGL } from "./supports-webgl";

test("unavailable WebGL falls back without throwing", () => {
  expect(
    supportsWebGL({ getContext: () => null } as unknown as HTMLCanvasElement)
  ).toBe(false);
  expect(
    supportsWebGL({
      getContext: () => {
        throw new Error("disabled");
      },
    } as unknown as HTMLCanvasElement)
  ).toBe(false);
});

test("WebGL detection releases its temporary graphics context", () => {
  const loseContext = mock(() => undefined);
  const getExtension = mock(() => ({ loseContext }));
  const getContext = mock(() => ({ getExtension }));
  expect(supportsWebGL({ getContext } as unknown as HTMLCanvasElement)).toBe(
    true
  );
  expect(getContext).toHaveBeenCalledWith("webgl2");
  expect(getExtension).toHaveBeenCalledWith("WEBGL_lose_context");
  expect(loseContext).toHaveBeenCalledTimes(1);
});

test("context release extension is optional", () => {
  expect(
    supportsWebGL({
      getContext: () => ({ getExtension: () => null }),
    } as unknown as HTMLCanvasElement)
  ).toBe(true);
});
