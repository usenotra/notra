import { expect, test } from "bun:test";

import { tourCardPosition } from "./product-tour";

const viewport = { width: 1200, height: 800 };

test("tour card sits under the highlighted area", () => {
  const position = tourCardPosition(
    { top: 80, left: 280, width: 360, height: 72 },
    viewport
  );
  expect(position.top).toBe(164);
  expect(position.left).toBe(280);
});

test("tour card flips above a target near the bottom", () => {
  const position = tourCardPosition(
    { top: 700, left: 40, width: 200, height: 40 },
    viewport
  );
  expect(position.top).toBe(520);
  expect(position.left).toBe(40);
});

test("tour card stays on screen when there is no target", () => {
  const position = tourCardPosition(null, viewport);
  expect(position.top).toBe(616);
  expect(position.left).toBe(390);
});
