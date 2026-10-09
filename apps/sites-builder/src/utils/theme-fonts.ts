import type { SiteConfig } from "@notra/sites-core/types/site-config";

import type { FontFace } from "../types/theme";

export function declaredFonts(fonts: SiteConfig["fonts"]): FontFace[] {
  const all: FontFace[] = [];
  for (const spec of [fonts, fonts?.body, fonts?.heading]) {
    if (
      spec?.family &&
      !all.some(
        (font) =>
          font.family === spec.family &&
          font.weight === spec.weight &&
          font.source === spec.source &&
          font.format === spec.format
      )
    ) {
      all.push({
        family: spec.family,
        weight: spec.weight,
        source: spec.source,
        format: spec.format,
      });
    }
  }
  return all;
}
