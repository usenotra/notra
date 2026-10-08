import { fileURLToPath } from "node:url";

export const SITE_CONFIG_JSON_SCHEMA_PATH = fileURLToPath(
  new URL("../../../../apps/web/public/schemas/blog.json", import.meta.url)
);
