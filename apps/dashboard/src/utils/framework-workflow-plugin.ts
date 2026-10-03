import { createRequire } from "node:module";

import type { Plugin } from "vite";
import { workflow } from "workflow/vite";

// Relative: vite.config.ts loads this file without the "@" alias.
import { WORKFLOW_ESBUILD_IDLE_STOP_MS } from "../constants/framework.ts";

export function traceWorkflowDependencies(files: string[], packages: string[]) {
  const require = createRequire(import.meta.url);
  files.push(...packages.map((name) => require.resolve(name)));
}

/** The esbuild the workflow builder bundles with (workflow → @workflow/nitro → @workflow/builders). */
function loadWorkflowEsbuild(): { stop: () => Promise<void> | void } {
  let require = createRequire(import.meta.url);
  for (const name of ["workflow", "@workflow/nitro", "@workflow/builders"]) {
    require = createRequire(require.resolve(name));
  }
  return require("esbuild");
}

/**
 * The dev workflow builder bundles with esbuild and leaves its service process
 * running (~600 MB RSS) after every build. Stopping it once the builds settle
 * frees that memory; esbuild starts a new service on the next build.
 */
function createEsbuildReleaser() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        await loadWorkflowEsbuild().stop();
      } catch {
        // Best effort: a running service only costs memory.
      }
    }, WORKFLOW_ESBUILD_IDLE_STOP_MS);
    timer.unref();
  };
}

type NitroSetup = (nitro: {
  options: { dev: boolean };
  hooks: { hook: (name: string, fn: () => void) => void };
}) => unknown;

export function dashboardWorkflow(): Plugin[] {
  const releaseEsbuild = createEsbuildReleaser();

  return workflow().map((plugin): Plugin => {
    if (plugin.name === "workflow:transform") {
      return {
        ...plugin,
        applyToEnvironment: (environment) => environment.name !== "nitro",
      };
    }
    if (plugin.name === "workflow:nitro") {
      const nitroPlugin = plugin as Plugin & { nitro: { setup: NitroSetup } };
      const setup = nitroPlugin.nitro.setup;
      return {
        ...nitroPlugin,
        nitro: {
          ...nitroPlugin.nitro,
          setup: async (nitro) => {
            await setup(nitro);
            if (nitro.options.dev) {
              // Registered after the workflow module's own hooks, so these
              // run once its builds have finished.
              nitro.hooks.hook("build:before", releaseEsbuild);
              nitro.hooks.hook("dev:reload", releaseEsbuild);
            }
          },
        },
      } as Plugin;
    }
    if (plugin.name === "workflow:hot-update" && plugin.hotUpdate) {
      const hotUpdate = plugin.hotUpdate as (
        this: unknown,
        ...args: unknown[]
      ) => Promise<unknown>;
      return {
        ...plugin,
        // Vite runs hotUpdate once per environment (client, ssr, nitro), and
        // each run rebuilt every workflow bundle. One environment is enough.
        applyToEnvironment: (environment) => environment.name === "client",
        async hotUpdate(...args: unknown[]) {
          const result = await hotUpdate.apply(this, args);
          releaseEsbuild();
          return result;
        },
      } as Plugin;
    }
    return plugin;
  });
}
