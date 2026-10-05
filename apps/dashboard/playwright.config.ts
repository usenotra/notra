import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./browser",
  testMatch: "**/*.pw.ts",
  fullyParallel: true,
  workers: 2,
  use: {
    baseURL: "http://127.0.0.1:3117",
    browserName: "chromium",
    viewport: { width: 1440, height: 600 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "bun run vite --config browser/vite.config.ts",
    url: "http://127.0.0.1:3117",
    reuseExistingServer: false,
  },
});
