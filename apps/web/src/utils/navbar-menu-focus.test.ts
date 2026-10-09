import { expect, test } from "bun:test";

import { getNavbarMenuFocusIndex } from "./navbar-menu-focus";

test("dropdown keyboard navigation moves, wraps and ignores other keys", () => {
  expect(getNavbarMenuFocusIndex("ArrowDown", 0, 7)).toBe(1);
  expect(getNavbarMenuFocusIndex("ArrowDown", 6, 7)).toBe(0);
  expect(getNavbarMenuFocusIndex("ArrowUp", 0, 7)).toBe(6);
  expect(getNavbarMenuFocusIndex("ArrowUp", 6, 7)).toBe(5);
  expect(getNavbarMenuFocusIndex("Home", 3, 7)).toBe(0);
  expect(getNavbarMenuFocusIndex("End", 3, 7)).toBe(6);
  expect(getNavbarMenuFocusIndex("Tab", 3, 7)).toBeUndefined();
  expect(getNavbarMenuFocusIndex("ArrowDown", 0, 0)).toBeUndefined();
});
