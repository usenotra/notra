import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

import { dashboardWorkflow } from "../../../src/utils/framework-workflow-plugin";

export default defineConfig({
  root: process.env.WORKFLOW_TEST_ROOT,
  plugins: [
    dashboardWorkflow(),
    nitro({
      preset: "node-server",
      compatibilityDate: "2026-10-02",
      workflow: { runtime: "nodejs24.x" },
      handlers: [{ route: "/probe", handler: "./src/probe.ts" }],
    }),
  ],
});
