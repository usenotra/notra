import { expect, test } from "bun:test";

import { NAVBAR_CONTENT_VARIANTS } from "@/constants/navbar-motion";

import { getNavbarPanelX } from "./navbar-panel-position";

test("panel positions keep wide menus centered and compact menus under their trigger", () => {
  expect(getNavbarPanelX(undefined, false)).toBe(0);
  expect(
    getNavbarPanelX({ width: 900, height: 274, anchorOffset: -160 }, false)
  ).toBe(-450);
  expect(
    getNavbarPanelX({ width: 352, height: 420, anchorOffset: 80 }, true)
  ).toBe(-96);
  expect(getNavbarPanelX({ width: 352, height: 420 }, true)).toBe(-176);
});

test("content swaps follow navigation direction without blurring a closing panel", () => {
  expect(NAVBAR_CONTENT_VARIANTS.enter(1).x).toBe(12);
  expect(NAVBAR_CONTENT_VARIANTS.enter(-1).x).toBe(-12);
  expect(NAVBAR_CONTENT_VARIANTS.enter(1).pointerEvents).toBe("none");
  expect(NAVBAR_CONTENT_VARIANTS.center.transitionEnd.pointerEvents).toBe(
    "auto"
  );
  expect(NAVBAR_CONTENT_VARIANTS.exit(1).pointerEvents).toBe("none");
  expect(NAVBAR_CONTENT_VARIANTS.exit(1).x).toBe(-4);
  expect(NAVBAR_CONTENT_VARIANTS.exit(-1).x).toBe(4);
  expect(NAVBAR_CONTENT_VARIANTS.exit(0).opacity).toBe(1);
  expect(NAVBAR_CONTENT_VARIANTS.exit(0).filter).toBe("blur(0px)");
});
