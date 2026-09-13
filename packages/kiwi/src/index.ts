import {
  ByteWriter,
  encodeDefinition,
  findDefinition,
  parseSchema,
} from "./codecs/kiwi";
import { packBuffer, packHtml } from "./codecs/packer";
import { buildSceneFromElement } from "./converters/dom-to-scene";
import { getSchemaBytes } from "./schemas/figma";
import type { BuildFigmaPasteHtmlOptions } from "./types/figma";

export { loadFallbackFont } from "./fonts/loader";

export async function buildFigmaPasteHtml(
  element: HTMLElement,
  options: BuildFigmaPasteHtmlOptions = {}
): Promise<string> {
  const schemaBytes = getSchemaBytes();
  const defs = parseSchema(schemaBytes);
  const messageIdx = findDefinition(defs, "Message");

  const sb = await buildSceneFromElement(element, { name: options.name });
  const message = sb.toMessage();

  const writer = new ByteWriter();
  encodeDefinition(writer, message, messageIdx, defs);
  const dataBytes = writer.get();

  const buffer = await packBuffer(schemaBytes, dataBytes);
  return packHtml(
    {
      fileKey: options.fileKey ?? "html-to-figma",
      pasteID: sb.pasteID,
      dataType: "scene",
    },
    buffer,
    options.label ?? options.name
  );
}

export async function copyAsFigma(
  element: HTMLElement,
  options: BuildFigmaPasteHtmlOptions = {}
): Promise<void> {
  const html = await buildFigmaPasteHtml(element, options);
  const blob = new Blob([html], { type: "text/html" });
  const item = new ClipboardItem({ "text/html": blob });
  await navigator.clipboard.write([item]);
}
