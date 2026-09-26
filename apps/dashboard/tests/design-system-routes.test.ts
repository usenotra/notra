import { describe, expect, mock, test } from "bun:test";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { NextRequest } from "next/server";

import { dashboardPageExtensions } from "../src/utils/dashboard-page-extensions";

const require = createRequire(import.meta.url);
const { createValidFileMatcher } =
  require("next/dist/server/lib/find-page-file") as {
    createValidFileMatcher: (
      extensions: string[],
      appDir: string
    ) => {
      isAppRouterPage: (path: string) => boolean;
      isAppLayoutPage: (path: string) => boolean;
    };
  };
const { getPageFromPath } = require("next/dist/build/route-discovery") as {
  getPageFromPath: (path: string, extensions: string[]) => string;
};
const appDir = fileURLToPath(new URL("../src/app", import.meta.url));

describe("design-system routes", () => {
  test.each(["page.dev.tsx", "icons/page.dev.tsx"])(
    "%s mounts only in development",
    (relativePath) => {
      const path = join(appDir, "design-system", relativePath);
      const devExtensions = dashboardPageExtensions("development");
      const prodExtensions = dashboardPageExtensions("production");

      expect(existsSync(path)).toBe(true);
      expect(
        createValidFileMatcher(devExtensions, appDir).isAppRouterPage(path)
      ).toBe(true);
      expect(getPageFromPath(path, devExtensions).endsWith("/page")).toBe(true);
      expect(
        createValidFileMatcher(prodExtensions, appDir).isAppRouterPage(path)
      ).toBe(false);
    }
  );

  test("the design-system layout is development-only", () => {
    const path = join(appDir, "design-system/layout.dev.tsx");
    expect(
      createValidFileMatcher(
        dashboardPageExtensions("development"),
        appDir
      ).isAppLayoutPage(path)
    ).toBe(true);
    expect(
      createValidFileMatcher(
        dashboardPageExtensions("production"),
        appDir
      ).isAppLayoutPage(path)
    ).toBe(false);
  });

  test("production requests return 404 before authentication", async () => {
    const originalEnv = process.env.NODE_ENV;
    Reflect.set(process.env, "NODE_ENV", "production");
    try {
      mock.module("server-only", () => ({}));
      const { default: proxy } = await import("../src/proxy");
      for (const pathname of ["/design-system", "/design-system/icons"]) {
        const response = await proxy(
          new NextRequest(`http://localhost${pathname}`)
        );
        expect(response.status).toBe(404);
      }
    } finally {
      if (originalEnv === undefined) {
        Reflect.deleteProperty(process.env, "NODE_ENV");
      } else {
        Reflect.set(process.env, "NODE_ENV", originalEnv);
      }
    }
  });
});
