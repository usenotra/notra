import type { CSSProperties } from "react";

/** A `fill` image covers its positioned parent. */
export const FILL_IMAGE_STYLE: CSSProperties = {
  position: "absolute",
  width: "100%",
  height: "100%",
  inset: 0,
};
