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

const { copyImageAsFigma, copyImageAsPaper, preloadImageExportCopy } =
  await import("./image-export");

const exportElement = {} as HTMLElement;

test("Paper and Figma copy call separate kiwi functions", async () => {
  copyAsFigma.mockClear();
  copyAsPaper.mockClear();

  await copyImageAsPaper(exportElement, "Card");
  expect(copyAsPaper).toHaveBeenCalledTimes(1);
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
  expect(copyAsPaper).toHaveBeenCalledTimes(1);
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
