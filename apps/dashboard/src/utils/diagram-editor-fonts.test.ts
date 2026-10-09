import { expect, test } from "bun:test";

import { DIAGRAM_EDITOR_FONT_TIMEOUT_MS } from "@/constants/diagram-editor";
import { waitForDiagramFonts } from "@/utils/diagram-editor-fonts";

test("diagram reveal waits for fonts but a stalled download cannot block it", async () => {
  const originalDocument = Object.getOwnPropertyDescriptor(
    globalThis,
    "document"
  );
  try {
    let resolveFonts = () => {};
    const fontsReady = new Promise<void>((resolve) => {
      resolveFonts = resolve;
    });
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { fonts: { ready: fontsReady } },
    });
    let revealed = false;
    const wait = waitForDiagramFonts().then(() => {
      revealed = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(revealed).toBe(false);
    resolveFonts();
    await wait;
    expect(revealed).toBe(true);

    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { fonts: { ready: new Promise(() => {}) } },
    });
    const start = performance.now();
    await waitForDiagramFonts();
    expect(performance.now() - start).toBeGreaterThanOrEqual(
      DIAGRAM_EDITOR_FONT_TIMEOUT_MS - 10
    );
    expect(performance.now() - start).toBeLessThan(
      DIAGRAM_EDITOR_FONT_TIMEOUT_MS + 500
    );
  } finally {
    if (originalDocument) {
      Object.defineProperty(globalThis, "document", originalDocument);
    } else {
      Reflect.deleteProperty(globalThis, "document");
    }
  }
});
