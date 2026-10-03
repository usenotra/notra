import { createRequire } from "node:module";

import type { Plugin } from "vite";
import { workflow } from "workflow/vite";

export function traceWorkflowDependencies(files: string[], packages: string[]) {
  const require = createRequire(import.meta.url);
  files.push(...packages.map((name) => require.resolve(name)));
}

export function dashboardWorkflow(): Plugin[] {
  return workflow().map((plugin) =>
    plugin.name === "workflow:transform"
      ? {
          ...plugin,
          applyToEnvironment: (environment) => environment.name !== "nitro",
        }
      : plugin
  );
}
