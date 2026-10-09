import { expect, mock, spyOn, test } from "bun:test";

import { toast } from "sonner";

import { copyDiagramScene } from "./image-export";

test("diagram copy keeps the native clipboard path and falls back without losing editable shapes", async () => {
  const globals = [
    "navigator",
    "document",
    "ClipboardItem",
    "HTMLElement",
    "fetch",
  ];
  const originals = globals.map((name) =>
    Object.getOwnPropertyDescriptor(globalThis, name)
  );
  const success = spyOn(toast, "success").mockImplementation(() => "success");
  const error = spyOn(toast, "error").mockImplementation(() => "error");
  const logError = spyOn(console, "error").mockImplementation(() => {});
  const scene = {
    elements: [{ id: "node", type: "rectangle", x: 10, y: 20 }],
    files: { image: { id: "image", dataURL: "data:image/png;base64,fixture" } },
  };
  const payload = { type: "excalidraw/clipboard", ...scene };
  const sceneUrl = "/api/organizations/fixture/content/fixture/excalidraw";
  let copiedText = "";
  const textarea = {
    value: "",
    readOnly: false,
    tabIndex: 0,
    style: {},
    select: mock(),
    remove: mock(),
  };
  const focus = mock();
  const nativeCopy = mock(() => {
    copiedText = textarea.value;
    return true;
  });
  const writeText = mock(async (text: string) => {
    copiedText = text;
  });
  const write = mock(async (items: [ClipboardItem]) => {
    copiedText = await (await items[0].getType("text/plain")).text();
  });
  let resolveScene = (_response: Response) => {};
  const fetchScene = mock(
    () =>
      new Promise<Response>((resolve) => {
        resolveScene = resolve;
      })
  );

  try {
    Object.defineProperties(globalThis, {
      navigator: {
        configurable: true,
        value: { clipboard: { write, writeText } },
      },
      document: {
        configurable: true,
        value: {
          activeElement: { focus },
          createElement: mock(() => textarea),
          body: { appendChild: mock() },
          execCommand: nativeCopy,
        },
      },
      HTMLElement: { configurable: true, value: Object },
      ClipboardItem: {
        configurable: true,
        value: mock((data: Record<string, Promise<Blob>>) => ({
          getType: (type: string) => data[type],
        })),
      },
      fetch: { configurable: true, value: fetchScene },
    });

    const copying = copyDiagramScene(sceneUrl, "excalidraw");
    // Safari requires clipboard.write to run before the download resolves.
    expect(write).toHaveBeenCalledTimes(1);
    resolveScene(Response.json(scene));
    await copying;
    expect(JSON.parse(copiedText)).toEqual(payload);
    expect(writeText).not.toHaveBeenCalled();
    expect(nativeCopy).not.toHaveBeenCalled();

    fetchScene.mockImplementation(async () => Response.json(scene));
    write.mockRejectedValue(new DOMException("Blocked", "NotAllowedError"));
    await copyDiagramScene(sceneUrl, "tldraw");
    expect(JSON.parse(copiedText)).toEqual(payload);
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(nativeCopy).not.toHaveBeenCalled();

    writeText.mockRejectedValue(new DOMException("Blocked", "NotAllowedError"));
    await copyDiagramScene(sceneUrl, "excalidraw");
    expect(JSON.parse(copiedText)).toEqual(payload);
    expect(nativeCopy).toHaveBeenCalledWith("copy");
    expect(textarea.select).toHaveBeenCalledTimes(1);
    expect(textarea.remove).toHaveBeenCalledTimes(1);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });

    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {},
    });
    await copyDiagramScene(sceneUrl, "tldraw");
    expect(JSON.parse(copiedText)).toEqual(payload);
    expect(textarea.remove).toHaveBeenCalledTimes(2);
    expect(success).toHaveBeenCalledTimes(4);
    expect(error).not.toHaveBeenCalled();
    // No second download is needed for any clipboard fallback.
    expect(fetchScene).toHaveBeenCalledTimes(4);

    nativeCopy.mockReturnValue(false);
    await copyDiagramScene(sceneUrl, "excalidraw");
    expect(success).toHaveBeenCalledTimes(4);
    expect(error).toHaveBeenCalledTimes(1);
    expect(textarea.remove).toHaveBeenCalledTimes(3);

    fetchScene.mockImplementation(
      async () => new Response(null, { status: 404 })
    );
    await copyDiagramScene(sceneUrl, "excalidraw");
    fetchScene.mockImplementation(async () =>
      Response.json({ type: "excalidraw" })
    );
    await copyDiagramScene(sceneUrl, "excalidraw");
    expect(success).toHaveBeenCalledTimes(4);
    expect(error).toHaveBeenCalledTimes(3);
    expect(nativeCopy).toHaveBeenCalledTimes(3);
  } finally {
    globals.forEach((name, index) => {
      const original = originals[index];
      if (original) {
        Object.defineProperty(globalThis, name, original);
      } else {
        Reflect.deleteProperty(globalThis, name);
      }
    });
    success.mockRestore();
    error.mockRestore();
    logError.mockRestore();
  }
});
