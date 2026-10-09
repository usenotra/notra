import { expect, mock, test } from "bun:test";

import { handleNavbarMenuKeyDown } from "./navbar-menu-keyboard";

function createMenuKeyEvent(
  key: string,
  itemIndex: number,
  triggerIndex: number,
  shiftKey = false
) {
  const items = Array.from({ length: 3 }, () => ({ focus: mock() }));
  const entries = ["Products", "Resources", "Reports", "Pricing"].map(
    (label) => ({
      getAttribute: () => `desktop-navigation-${label}`,
      focus: mock(),
    })
  );
  const event = {
    key,
    shiftKey,
    target: items[itemIndex],
    currentTarget: {
      id: entries[triggerIndex]?.getAttribute(),
      querySelectorAll: () => items,
      closest: () => ({ querySelectorAll: () => entries }),
    },
    preventDefault: mock(),
  };
  return { event, items, entries };
}

test("Tab exits each menu to the next navigation entry; Shift+Tab returns to its trigger", () => {
  for (const triggerIndex of [0, 1, 2]) {
    for (const shiftKey of [false, true]) {
      const { event, entries } = createMenuKeyEvent(
        "Tab",
        shiftKey ? 0 : 2,
        triggerIndex,
        shiftKey
      );
      const closePanel = mock();
      handleNavbarMenuKeyDown(
        event as unknown as Parameters<typeof handleNavbarMenuKeyDown>[0],
        closePanel
      );
      expect(
        entries[triggerIndex + (shiftKey ? 0 : 1)]?.focus
      ).toHaveBeenCalledTimes(1);
      expect(event.preventDefault).toHaveBeenCalledTimes(1);
      expect(closePanel).toHaveBeenCalledTimes(1);
    }
  }
});

test("interior Tab stays native, while arrows move focus without closing the menu", () => {
  for (const key of ["Tab", "ArrowDown"]) {
    const { event, items } = createMenuKeyEvent(key, 1, 0);
    const closePanel = mock();
    handleNavbarMenuKeyDown(
      event as unknown as Parameters<typeof handleNavbarMenuKeyDown>[0],
      closePanel
    );
    expect(event.preventDefault).toHaveBeenCalledTimes(key === "Tab" ? 0 : 1);
    expect(items[2]?.focus).toHaveBeenCalledTimes(key === "Tab" ? 0 : 1);
    expect(closePanel).not.toHaveBeenCalled();
  }
});
