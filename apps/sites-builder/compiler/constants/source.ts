import { SITE_SOURCE_EXTENSIONS } from "@notra/sites-core/constants/sites";

export const ALLOWED_EXTENSIONS = new Set<string>(SITE_SOURCE_EXTENSIONS);
export const SAFE_SEGMENT = /^[A-Za-z0-9._@()+ -]+$/;
