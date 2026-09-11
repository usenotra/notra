import { beforeEach, expect, mock, spyOn, test } from "bun:test";

let initAttempts = 0;
const init = mock(() => {
  initAttempts += 1;
  if (initAttempts === 1) {
    throw new Error("transient initialization failure");
  }
});
mock.module("posthog-js", () => ({ default: { init } }));
mock.module("@/constants/posthog", () => ({
  POSTHOG_PROJECT_TOKEN: "test-token",
  POSTHOG_CONFIG: {},
}));

const {
  abandonPendingPostHogInit,
  getPostHogInitGeneration,
  initPostHog,
  resetPostHogForTests,
  whenPostHogReady,
  withPostHog,
} = await import("./posthog-lazy");
const { flushTrackEvent } = await import("./posthog-client");

type TimeoutHandle = number;

function restoreWindow(previousWindow: PropertyDescriptor | undefined): void {
  if (previousWindow) {
    Object.defineProperty(globalThis, "window", previousWindow);
  } else {
    Reflect.deleteProperty(globalThis, "window");
  }
}

beforeEach(() => {
  initAttempts = 0;
});

test("idle identity waits without starting init, then a failed init retries", async () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { location: { hostname: "localhost" } },
  });
  const errorLog = spyOn(console, "error").mockImplementation(() => undefined);
  try {
    const idleCallback = mock(() => undefined);
    const actionCallback = mock(() => undefined);
    const ready = whenPostHogReady(idleCallback);
    await Promise.resolve();
    expect(initAttempts).toBe(0);
    expect(idleCallback).not.toHaveBeenCalled();

    initPostHog();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(initAttempts).toBe(1);
    expect(idleCallback).not.toHaveBeenCalled();

    await withPostHog(actionCallback);
    await ready;
    expect(initAttempts).toBe(2);
    expect(actionCallback).toHaveBeenCalledTimes(1);
    expect(idleCallback).toHaveBeenCalledTimes(1);
  } finally {
    errorLog.mockRestore();
    restoreWindow(previousWindow);
    resetPostHogForTests();
  }
});

test("flushTrackEvent abandons a hung init so a later event can retry", async () => {
  const staleInit = mock(() => undefined);
  const liveInit = mock(() => undefined);
  let importCalls = 0;
  let resolveStale:
    | ((module: { default: { init: typeof staleInit } }) => void)
    | undefined;

  resetPostHogForTests(() => {
    importCalls += 1;
    if (importCalls === 1) {
      return new Promise((resolve) => {
        resolveStale = resolve;
      });
    }
    return Promise.resolve({ default: { init: liveInit } });
  });

  const pending = new Map<TimeoutHandle, () => void>();
  let nextId = 1;
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: { hostname: "localhost" },
      setTimeout(callback: TimerHandler): TimeoutHandle {
        const id = nextId;
        nextId += 1;
        if (typeof callback === "function") {
          pending.set(id, callback as () => void);
        }
        return id;
      },
      clearTimeout(id?: TimeoutHandle) {
        if (typeof id === "number") {
          pending.delete(id);
        }
      },
    },
  });

  try {
    const hungFlush = flushTrackEvent("$pageview");
    expect(pending.size).toBe(1);
    for (const callback of pending.values()) {
      callback();
    }
    await hungFlush;

    const retried = mock(() => undefined);
    await withPostHog(retried);
    expect(importCalls).toBe(2);
    expect(liveInit).toHaveBeenCalledTimes(1);
    expect(retried).toHaveBeenCalledTimes(1);

    resolveStale?.({ default: { init: staleInit } });
    await Promise.resolve();
    await Promise.resolve();
    expect(staleInit).not.toHaveBeenCalled();
    expect(liveInit).toHaveBeenCalledTimes(1);
  } finally {
    restoreWindow(previousWindow);
    resetPostHogForTests();
  }
});

test("flush timeout does not abandon an idle init already in flight", async () => {
  const liveInit = mock(() => undefined);
  let importCalls = 0;
  let resolveIdle:
    | ((module: { default: { init: typeof liveInit } }) => void)
    | undefined;

  resetPostHogForTests(() => {
    importCalls += 1;
    return new Promise((resolve) => {
      resolveIdle = resolve;
    });
  });

  const pending = new Map<TimeoutHandle, () => void>();
  let nextId = 1;
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: { hostname: "localhost" },
      setTimeout(callback: TimerHandler): TimeoutHandle {
        const id = nextId;
        nextId += 1;
        if (typeof callback === "function") {
          pending.set(id, callback as () => void);
        }
        return id;
      },
      clearTimeout(id?: TimeoutHandle) {
        if (typeof id === "number") {
          pending.delete(id);
        }
      },
    },
  });

  try {
    initPostHog();
    const flush = flushTrackEvent("$pageview");
    expect(pending.size).toBe(1);
    for (const callback of pending.values()) {
      callback();
    }
    await flush;

    resolveIdle?.({ default: { init: liveInit } });
    const identified = mock(() => undefined);
    const captured = mock(() => undefined);
    const ready = whenPostHogReady(identified);
    await withPostHog(captured);
    await ready;

    expect(importCalls).toBe(1);
    expect(liveInit).toHaveBeenCalledTimes(1);
    expect(captured).toHaveBeenCalledTimes(1);
    expect(identified).toHaveBeenCalledTimes(1);
  } finally {
    restoreWindow(previousWindow);
    resetPostHogForTests();
  }
});

test("a timed-out flush does not abandon a newer init", async () => {
  const liveInit = mock(() => undefined);
  let importCalls = 0;
  let resolveLive:
    | ((module: { default: { init: typeof liveInit } }) => void)
    | undefined;

  resetPostHogForTests(() => {
    importCalls += 1;
    if (importCalls === 1) {
      return new Promise(() => undefined);
    }
    return new Promise((resolve) => {
      resolveLive = resolve;
    });
  });

  const pending = new Map<TimeoutHandle, () => void>();
  let nextId = 1;
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: { hostname: "localhost" },
      setTimeout(callback: TimerHandler): TimeoutHandle {
        const id = nextId;
        nextId += 1;
        if (typeof callback === "function") {
          pending.set(id, callback as () => void);
        }
        return id;
      },
      clearTimeout(id?: TimeoutHandle) {
        if (typeof id === "number") {
          pending.delete(id);
        }
      },
    },
  });

  try {
    const hungFlush = flushTrackEvent("$pageview");
    const staleAttempt = getPostHogInitGeneration();
    const staleTimeout = pending.values().next().value as () => void;
    staleTimeout();
    await hungFlush;

    const retried = mock(() => undefined);
    const newer = withPostHog(retried);
    abandonPendingPostHogInit(staleAttempt);
    resolveLive?.({ default: { init: liveInit } });
    await newer;

    expect(importCalls).toBe(2);
    expect(liveInit).toHaveBeenCalledTimes(1);
    expect(retried).toHaveBeenCalledTimes(1);
  } finally {
    restoreWindow(previousWindow);
    resetPostHogForTests();
  }
});
