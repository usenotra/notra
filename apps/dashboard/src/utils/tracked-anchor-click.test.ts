import { expect, mock, test } from "bun:test";

import type { ModifiedClickEvent } from "@/types/tracked-anchor-click";

import {
  handleTrackedAnchorClick,
  isModifiedClick,
} from "./tracked-anchor-click";

function clickEvent(
  overrides: Partial<ModifiedClickEvent> = {}
): ModifiedClickEvent {
  return {
    button: 0,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    ...overrides,
  };
}

test("isModifiedClick is false for a primary unmodified click", () => {
  expect(isModifiedClick(clickEvent())).toBe(false);
});

test("isModifiedClick is true for middle-click and modifier keys", () => {
  expect(isModifiedClick(clickEvent({ button: 1 }))).toBe(true);
  expect(isModifiedClick(clickEvent({ metaKey: true }))).toBe(true);
  expect(isModifiedClick(clickEvent({ ctrlKey: true }))).toBe(true);
  expect(isModifiedClick(clickEvent({ shiftKey: true }))).toBe(true);
  expect(isModifiedClick(clickEvent({ altKey: true }))).toBe(true);
});

test("handleTrackedAnchorClick does not preventDefault on modifier clicks", () => {
  const preventDefault = mock(() => undefined);
  const assign = mock(() => undefined);
  const track = mock(() => Promise.resolve());
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { location: { assign } },
  });

  try {
    handleTrackedAnchorClick(
      {
        ...clickEvent({ metaKey: true }),
        preventDefault,
        currentTarget: { href: "https://example.com/oauth" },
      },
      track
    );
    expect(preventDefault).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
    expect(track).toHaveBeenCalledTimes(1);
  } finally {
    if (previousWindow) {
      Object.defineProperty(globalThis, "window", previousWindow);
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }
  }
});

test("handleTrackedAnchorClick prevents default then assigns after track", async () => {
  const preventDefault = mock(() => undefined);
  const assign = mock(() => undefined);
  let resolveTrack: (() => void) | undefined;
  const track = mock(
    () =>
      new Promise<void>((resolve) => {
        resolveTrack = resolve;
      })
  );
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { location: { assign } },
  });

  try {
    handleTrackedAnchorClick(
      {
        ...clickEvent(),
        preventDefault,
        currentTarget: { href: "https://example.com/oauth" },
      },
      track
    );
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(assign).not.toHaveBeenCalled();
    resolveTrack?.();
    await Promise.resolve();
    await Promise.resolve();
    expect(assign).toHaveBeenCalledWith("https://example.com/oauth");
  } finally {
    if (previousWindow) {
      Object.defineProperty(globalThis, "window", previousWindow);
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }
  }
});
