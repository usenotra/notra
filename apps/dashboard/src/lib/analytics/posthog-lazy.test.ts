import { expect, mock, spyOn, test } from "bun:test";

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

const { initPostHog, whenPostHogReady, withPostHog } =
  await import("./posthog-lazy");

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
    if (previousWindow) {
      Object.defineProperty(globalThis, "window", previousWindow);
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }
  }
});
