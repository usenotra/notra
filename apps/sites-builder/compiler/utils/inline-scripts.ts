import { createHash } from "node:crypto";

import {
  EXECUTABLE_SCRIPT_TYPES,
  SCRIPT_ELEMENT,
  SRC_ATTRIBUTE,
  TYPE_ATTRIBUTE,
} from "../constants/inline-scripts";

export function inlineScriptHashes(html: string): string[] {
  const hashes: string[] = [];
  for (const [, attributes = "", body = ""] of html.matchAll(SCRIPT_ELEMENT)) {
    if (SRC_ATTRIBUTE.test(attributes) || body === "") {
      continue;
    }
    const type = TYPE_ATTRIBUTE.exec(attributes);
    const typeValue = (type?.[1] ?? type?.[2] ?? type?.[3] ?? "")
      .trim()
      .toLowerCase();
    if (!EXECUTABLE_SCRIPT_TYPES.has(typeValue)) {
      continue;
    }
    const text = body.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
    hashes.push(createHash("sha256").update(text, "utf8").digest("base64"));
  }
  return hashes;
}
