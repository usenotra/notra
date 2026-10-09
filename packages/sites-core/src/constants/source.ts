import { SITE_SOURCE_EXTENSIONS } from "./sites";

export const SITE_SOURCE_ALLOWED_EXTENSIONS: ReadonlySet<string> = new Set(
  SITE_SOURCE_EXTENSIONS
);
export const SITE_SOURCE_SAFE_SEGMENT = /^[A-Za-z0-9._@()+ -]+$/;
