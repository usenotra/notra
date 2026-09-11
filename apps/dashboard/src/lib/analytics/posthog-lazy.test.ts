import { expect, mock, spyOn, test } from "bun:test";

const init = mock(() => {
  if (init.mock.calls.length === 1) {
    throw new Error("transient initialization failure");
  }
});
mock.module("posthog-js", () => ({ default: { init } }));
mock.module("@/constants/posthog", () => ({
  POSTHOG_PROJECT_TOKEN: "test-token",
  POSTHOG_CONFIG: {},
}));

const { initPostHog, withPostHog } = await import("./posthog-lazy");

test("a failed deferred initialization is handled and the next call retries", async () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { location: { hostname: "localhost" } },
  });
  const errorLog = spyOn(console, "error").mockImplementation(() => undefined);
  try {
    const callback = mock(() => undefined);
    initPostHog();
    await withPostHog(callback);
    expect(init).toHaveBeenCalledTimes(1);
    expect(callback).not.toHaveBeenCalled();
    await withPostHog(callback);
    expect(init).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenCalledTimes(1);
  } finally {
    errorLog.mockRestore();
    if (previousWindow) {
      Object.defineProperty(globalThis, "window", previousWindow);
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }
  }
});
