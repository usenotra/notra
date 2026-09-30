import { describe, expect, test } from "bun:test";

import { normalizeCssColorWithContext } from "../src/utils/css-color";

function colorContext(initial = "#abcdef") {
  let fillStyle = initial;
  return {
    get fillStyle() {
      return fillStyle;
    },
    set fillStyle(value: string) {
      if (value === "black") {
        fillStyle = "#000000";
      } else if (value === "white") {
        fillStyle = "#ffffff";
      } else if (/^#[\da-f]{6}$/i.test(value)) {
        fillStyle = value.toLowerCase();
      }
    },
  } as Pick<CanvasRenderingContext2D, "fillStyle">;
}

describe("CSS color normalization", () => {
  test("accepts named colors that normalize to black", () => {
    expect(normalizeCssColorWithContext("black", colorContext())).toBe(
      "#000000"
    );
  });

  test("rejects invalid colors and restores the canvas state", () => {
    const context = colorContext();

    expect(normalizeCssColorWithContext("not-a-color", context)).toBeNull();
    expect(context.fillStyle).toBe("#abcdef");
  });

  test("accepts other named colors and restores the canvas state", () => {
    const context = colorContext();

    expect(normalizeCssColorWithContext("white", context)).toBe("#ffffff");
    expect(context.fillStyle).toBe("#abcdef");
  });
});
