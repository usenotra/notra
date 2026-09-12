import { expect, mock, test } from "bun:test";

const copyAsFigma = mock(async () => undefined);
const copyAsPaper = mock(async () => undefined);

mock.module("@notra/kiwi", () => ({ copyAsFigma }));
mock.module("@notra/kiwi/paper", () => ({ copyAsPaper }));
mock.module("sonner", () => ({
  toast: {
    success: mock(() => undefined),
    error: mock(() => undefined),
  },
}));

const {
  copyImageAsFigma,
  copyImageAsPaper,
  preloadImageExportCopy,
  resetImageExportCopyForTests,
} = await import("./image-export");

const exportElement = {} as HTMLElement;

function withWindow<T>(run: () => T | Promise<T>): T | Promise<T> {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: previousWindow?.value ?? {},
  });
  const restore = () => {
    if (previousWindow) {
      Object.defineProperty(globalThis, "window", previousWindow);
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }
  };
  try {
    const result = run();
    if (result instanceof Promise) {
      return result.finally(restore);
    }
    restore();
    return result;
  } catch (error) {
    restore();
    throw error;
  }
}

test("preload with window warms the kiwi chunk without copying", async () => {
  let paperImports = 0;
  let figmaImports = 0;
  copyAsPaper.mockClear();
  copyAsFigma.mockClear();
  resetImageExportCopyForTests({
    paper: async () => {
      paperImports += 1;
      return (await import("@notra/kiwi/paper")).copyAsPaper;
    },
    figma: async () => {
      figmaImports += 1;
      return (await import("@notra/kiwi")).copyAsFigma;
    },
  });

  try {
    await withWindow(async () => {
      preloadImageExportCopy("paper");
      await Promise.resolve();
      await Promise.resolve();
      expect(copyAsPaper).not.toHaveBeenCalled();
      expect(copyAsFigma).not.toHaveBeenCalled();
      expect(paperImports).toBe(1);
      expect(figmaImports).toBe(0);

      preloadImageExportCopy("paper");
      await Promise.resolve();
      expect(paperImports).toBe(1);

      await copyImageAsPaper(exportElement, "Card");
      expect(copyAsPaper).toHaveBeenCalledTimes(1);
      expect(paperImports).toBe(1);

      preloadImageExportCopy("figma");
      await Promise.resolve();
      await Promise.resolve();
      expect(copyAsFigma).not.toHaveBeenCalled();
      expect(figmaImports).toBe(1);
    });
  } finally {
    resetImageExportCopyForTests();
  }
});

test("preload with window swallows a failed paper import and click retries", async () => {
  let paperImports = 0;
  copyAsPaper.mockClear();
  resetImageExportCopyForTests({
    paper: async () => {
      paperImports += 1;
      if (paperImports === 1) {
        throw new Error("paper chunk failed");
      }
      return (await import("@notra/kiwi/paper")).copyAsPaper;
    },
  });

  try {
    await withWindow(async () => {
      expect(() => preloadImageExportCopy("paper")).not.toThrow();
      await Promise.resolve();
      await Promise.resolve();
      expect(copyAsPaper).not.toHaveBeenCalled();
      expect(paperImports).toBe(1);

      await copyImageAsPaper(exportElement, "Card");
      expect(copyAsPaper).toHaveBeenCalledTimes(1);
      expect(paperImports).toBe(2);
    });
  } finally {
    resetImageExportCopyForTests();
  }
});

test("Paper and Figma copy call separate kiwi functions", async () => {
  copyAsFigma.mockClear();
  copyAsPaper.mockClear();

  await copyImageAsPaper(exportElement, "Card");
  expect(copyAsPaper).toHaveBeenCalledWith(exportElement, {
    label: "Card",
    name: "Card",
  });
  expect(copyAsFigma).not.toHaveBeenCalled();

  await copyImageAsFigma(exportElement, "Card");
  expect(copyAsFigma).toHaveBeenCalledTimes(1);
  expect(copyAsFigma).toHaveBeenCalledWith(exportElement, {
    label: "Card",
    name: "Card",
  });
});

test("preload is a no-op without window and does not copy", () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Reflect.deleteProperty(globalThis, "window");
  copyAsPaper.mockClear();
  copyAsFigma.mockClear();
  try {
    preloadImageExportCopy("paper");
    preloadImageExportCopy("figma");
    expect(copyAsPaper).not.toHaveBeenCalled();
    expect(copyAsFigma).not.toHaveBeenCalled();
  } finally {
    if (previousWindow) {
      Object.defineProperty(globalThis, "window", previousWindow);
    }
  }
});

async function expectNoUnhandledRejection(
  run: () => Promise<void>
): Promise<void> {
  const unhandled: unknown[] = [];
  const onUnhandled = (reason: unknown) => {
    unhandled.push(reason);
  };
  process.on("unhandledRejection", onUnhandled);
  try {
    await run();
    await Promise.resolve();
    await Promise.resolve();
    expect(unhandled).toEqual([]);
  } finally {
    process.off("unhandledRejection", onUnhandled);
  }
}

test("a failed kiwi import during a skipped copy does not reject unhandled", async () => {
  const errorLog = mock(() => undefined);
  const previousError = console.error;
  console.error = errorLog;
  resetImageExportCopyForTests({
    figma: async () => {
      throw new Error("figma chunk failed");
    },
    paper: async () => {
      throw new Error("paper chunk failed");
    },
  });

  try {
    await expectNoUnhandledRejection(async () => {
      await copyImageAsFigma(null);
      await copyImageAsPaper(null);
    });
  } finally {
    console.error = previousError;
    resetImageExportCopyForTests();
  }
});
