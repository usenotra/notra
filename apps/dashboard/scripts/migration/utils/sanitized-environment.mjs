import { readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { LOCAL_ENVIRONMENT } from "../constants/environment.mjs";

export function sanitizedEnvironment(source = process.env) {
  return {
    PATH: source.PATH ?? "/usr/local/bin:/usr/bin:/bin",
    LANG: "C.UTF-8",
    TZ: "UTC",
    ...LOCAL_ENVIRONMENT,
  };
}

export function assertNoDotenv(directory) {
  let current = resolve(directory);
  for (;;) {
    const files = readdirSync(current);
    if (
      files.some(
        (file) =>
          (file === ".env" || file.startsWith(".env.")) &&
          file !== ".env.example" &&
          file !== ".env.template"
      )
    ) {
      throw new Error(
        `Dotenv files are forbidden in benchmark ancestry: ${current}`
      );
    }
    const parent = dirname(current);
    if (parent === current) {
      return;
    }
    current = parent;
  }
}
