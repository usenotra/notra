import { expect, mock, test } from "bun:test";

const cal = mock(() => undefined);
const getCalApi = mock(async () => {
  if (getCalApi.mock.calls.length === 1) {
    throw new Error("script unavailable");
  }
  return cal;
});
const showError = mock(() => undefined);
mock.module("@calcom/embed-react", () => ({ getCalApi }));
mock.module("sonner", () => ({ toast: { error: showError } }));
const { scheduleDemo } = await import("./schedule-demo");

test("booking handles a failed load and retries on the next user action", async () => {
  const previousDocument = Object.getOwnPropertyDescriptor(
    globalThis,
    "document"
  );
  const click = mock(() => undefined);
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { querySelector: () => ({ click }) },
  });
  try {
    await scheduleDemo();
    expect(showError).toHaveBeenCalledTimes(1);
    expect(click).not.toHaveBeenCalled();
    await scheduleDemo();
    expect(getCalApi).toHaveBeenCalledTimes(2);
    expect(click).toHaveBeenCalledTimes(1);
  } finally {
    if (previousDocument) {
      Object.defineProperty(globalThis, "document", previousDocument);
    } else {
      Reflect.deleteProperty(globalThis, "document");
    }
  }
});
