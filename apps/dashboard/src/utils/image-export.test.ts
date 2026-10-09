import { expect, test } from "bun:test";

import { getImageExcalidrawUrl } from "./image-content";
import { getAvailableImageExportTargets } from "./image-export";

test("Excalidraw and tldraw are only offered for images with a scene", () => {
  expect(getAvailableImageExportTargets(false)).toEqual([
    "paper",
    "figma",
    "wonder",
  ]);
  expect(getAvailableImageExportTargets(true)).toEqual([
    "paper",
    "figma",
    "excalidraw",
    "tldraw",
    "wonder",
  ]);
});

test("reads the scene URL only from http(s) metadata", () => {
  const base = { content: "", htmlUrl: null, markdown: null, rawHtml: null };

  expect(
    getImageExcalidrawUrl({
      ...base,
      sourceMetadata: { excalidrawUrl: "https://cdn.example.com/a.excalidraw" },
    })
  ).toBe("https://cdn.example.com/a.excalidraw");
  expect(
    getImageExcalidrawUrl({
      ...base,
      sourceMetadata: { excalidrawUrl: "data:application/json,{}" },
    })
  ).toBeNull();
  expect(
    getImageExcalidrawUrl({ ...base, sourceMetadata: { format: "marketing" } })
  ).toBeNull();
  expect(getImageExcalidrawUrl({ ...base, sourceMetadata: null })).toBeNull();
});
