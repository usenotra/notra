import { expect, mock, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { createElement, type EffectCallback } from "react";
import { renderToStaticMarkup } from "react-dom/server";

if (!process.env.NOTRA_SHARED_CAROUSEL_TEST_WORKER) {
  test("shared carousels release their listeners across effect replay", () => {
    const result = spawnSync(
      process.execPath,
      ["test", fileURLToPath(import.meta.url)],
      {
        cwd: fileURLToPath(new URL("../../..", import.meta.url)),
        env: { ...process.env, NOTRA_SHARED_CAROUSEL_TEST_WORKER: "1" },
        timeout: 30_000,
      }
    );
    expect(result.status, result.stderr?.toString()).toBe(0);
  });
} else {
  const react = await import("react");
  const useState = react.useState;
  const effects: EffectCallback[] = [];
  const listeners = new Map<string, Set<unknown>>();
  const api = {
    canScrollPrev: () => false,
    canScrollNext: () => true,
    scrollSnapList: () => [0, 1, 2],
    selectedScrollSnap: () => 0,
    on(event: string, listener: unknown) {
      let registered = listeners.get(event);
      if (!registered) {
        registered = new Set();
        listeners.set(event, registered);
      }
      registered.add(listener);
      return api;
    },
    off(event: string, listener: unknown) {
      listeners.get(event)?.delete(listener);
      return api;
    },
  };
  mock.module("react", () => ({
    ...react,
    useEffect: (effect: EffectCallback) => effects.push(effect),
    useState: (initial?: unknown) =>
      useState(initial === undefined ? api : initial),
  }));
  mock.module("embla-carousel-react", () => ({
    default: () => [() => {}, api],
  }));
  const { InlineCitationCarousel, InlineCitationCarouselIndex } =
    await import("@notra/ui/components/ai-elements/inline-citation");

  test("both carousel owners unregister every exact callback", () => {
    renderToStaticMarkup(
      createElement(
        InlineCitationCarousel,
        {},
        createElement(InlineCitationCarouselIndex)
      )
    );
    expect(effects).toHaveLength(3);
    for (let replay = 0; replay < 2; replay++) {
      const cleanups = effects.map((effect) => effect());
      expect(listeners.get("reInit")?.size).toBe(1);
      expect(listeners.get("select")?.size).toBe(2);
      for (const cleanup of cleanups) {
        if (typeof cleanup === "function") {
          cleanup();
        }
      }
      expect(listeners.get("reInit")?.size).toBe(0);
      expect(listeners.get("select")?.size).toBe(0);
    }
  });
}
