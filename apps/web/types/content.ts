import type { blog, notraChangelog } from "../.source/server";

export type ContentEntry =
  | (typeof blog)[number]
  | (typeof notraChangelog)[number];
