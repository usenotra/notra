import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

const FONT_WEIGHTS = ["400", "600", "700", "800"] as const;

let started = false;

export function ensureStarVideoFonts(): void {
  if (started || typeof FontFace === "undefined") {
    return;
  }
  started = true;

  for (const weight of FONT_WEIGHTS) {
    loadFont({
      family: "Inter",
      url: staticFile(`fonts/inter-${weight}.woff2`),
      weight,
      format: "woff2",
    });
  }
}
