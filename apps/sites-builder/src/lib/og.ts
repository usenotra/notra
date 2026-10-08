import { readFileSync } from "node:fs";
import { join } from "node:path";

import { OG_MANIFEST_FILE } from "../constants/og";
import { assetUrl, params } from "./params";

function readManifest(): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(
      readFileSync(join(params.workDir, OG_MANIFEST_FILE), "utf8")
    );
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}

const manifest = readManifest();

export function generatedImage(slug: string): string | undefined {
  const path = manifest[`${params.area}/${slug}`];
  return typeof path === "string" && path.startsWith("/")
    ? assetUrl(path)
    : undefined;
}
