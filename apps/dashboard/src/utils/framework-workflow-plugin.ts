import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";

import { type Plugin, transformWithOxc } from "vite";
import { workflow } from "workflow/vite";

// Relative: vite.config.ts loads this file without the "@" alias.
import {
  SOURCE_MAPPING_URL_COMMENT,
  WORKFLOW_DEV_BUNDLE_FILES,
  WORKFLOW_DEV_DYNAMIC_IMPORT,
  WORKFLOW_DEV_OUTPUT_PATTERN,
  WORKFLOW_DEV_REQUIRE_BANNER,
  WORKFLOW_DEV_HANDLER_IDS,
  WORKFLOW_ESBUILD_IDLE_STOP_MS,
} from "../constants/framework.ts";

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
  options: { dev: boolean; buildDir: string; virtual: Record<string, unknown> };
  hooks: { hook: (name: string, fn: (...args: never[]) => void) => void };
}) => unknown;

function withoutInputSourceMaps<T extends object>(plugin: T): T {
  const transform = "transform" in plugin ? plugin.transform : undefined;
  if (typeof transform !== "function") {
    return plugin;
  }
  return {
    ...plugin,
    transform(this: unknown, code: string, ...rest: unknown[]) {
      return transform.call(
        this,
        code.replace(SOURCE_MAPPING_URL_COMMENT, ""),
        ...rest
      );
    },
  };
}

/**
 * Outside Vercel builds the workflow builder keeps JSX as written
 * (`jsx: "preserve"`), so the email templates a step reaches leave raw JSX in
 * the dev bundles, and its ESM output has no `require` for CommonJS
 * externals. Patching both in place keeps them loadable by plain Node.
 */
async function compileWorkflowDevBundles(buildDir: string) {
  await Promise.all(
    WORKFLOW_DEV_BUNDLE_FILES.map(async (file) => {
      const path = join(buildDir, "workflow", file);
      const code = await readFile(path, "utf8").catch(() => null);
      if (code === null) {
        return;
      }
      if (code.startsWith(WORKFLOW_DEV_REQUIRE_BANNER)) {
        return;
      }
      const result = await transformWithOxc(code, path, {
        lang: "jsx",
        jsx: { runtime: "automatic" },
      });
      // esbuild's __require shim needs a real require for the CommonJS
      // packages the bundle keeps external (undici, pg).
      await writeFile(path, `${WORKFLOW_DEV_REQUIRE_BANNER}${result.code}`);
    })
  );
}

/**
 * The builder writes its dev bundles for Node: dependencies are relative
 * paths into node_modules, CommonJS ones included (pg). The dev handlers
 * the workflow Nitro module generates import them with `import()`, which Vite's module
 * runner intercepts and inlines as ESM, failing with "require is not
 * defined", so every step answered 500 and site jobs never left the queue.
 * Importing natively lets Node resolve them as the builder intends.
 */
function importWorkflowDevBundlesNatively(virtual: Record<string, unknown>) {
  for (const key of WORKFLOW_DEV_HANDLER_IDS) {
    const source = virtual[key];
    if (typeof source === "string") {
      virtual[key] =
        `const nativeImport = new Function("specifier", "return import(specifier)");\n${source.replaceAll(
          WORKFLOW_DEV_DYNAMIC_IMPORT,
          "nativeImport("
        )}`;
    }
  }
}

export function dashboardWorkflow(): Plugin[] {
  const releaseEsbuild = createEsbuildReleaser();
  let devBuildDir: string | null = null;
  const compileDevBundles = async () => {
    if (devBuildDir) {
      await compileWorkflowDevBundles(devBuildDir);
    }
  };

  const plugins = workflow().map((plugin): Plugin => {
    if (plugin.name === "workflow:transform") {
      return {
        ...withoutInputSourceMaps(plugin),
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
              importWorkflowDevBundlesNatively(nitro.options.virtual);
            }
            nitro.hooks.hook(
              "rollup:before",
              (_nitro: unknown, config: { plugins?: unknown }) => {
                if (!Array.isArray(config.plugins)) {
                  return;
                }
                config.plugins = config.plugins.map((rollupPlugin) =>
                  rollupPlugin?.name === "workflow:transform"
                    ? withoutInputSourceMaps(rollupPlugin)
                    : rollupPlugin
                );
              }
            );
            if (nitro.options.dev) {
              devBuildDir = nitro.options.buildDir;
              // Registered after the workflow module's own hooks, so these
              // run once its builds have finished.
              nitro.hooks.hook("build:before", compileDevBundles);
              nitro.hooks.hook("dev:reload", compileDevBundles);
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
          // The generated bundles contain "use step" themselves; treating a
          // write to them as a source change rebuilt them in a loop.
          const [update] = args as [{ file?: string } | undefined];
          if (update?.file && WORKFLOW_DEV_OUTPUT_PATTERN.test(update.file)) {
            return;
          }
          const result = await hotUpdate.apply(this, args);
          await compileDevBundles();
          releaseEsbuild();
          return result;
        },
      } as Plugin;
    }
    return plugin;
  });
  return plugins;
}
