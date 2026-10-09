import type { DevRefreshOptions } from "../types/dev-refresh";
import { siteHeadScripts } from "./head-scripts";
import { hasReactComponents } from "./react";

export function createDevRefresh(options: DevRefreshOptions) {
  let revision = 0;
  let pending = false;
  let closed = false;
  let active = false;
  let published = "";
  let delayMs = 0;
  let running: Promise<boolean> | undefined;
  let stopping: Promise<void> | undefined;
  let wake: (() => void) | undefined;

  const stopAstro = async () => {
    if (!active) {
      return;
    }
    const code = await options.runAstro("stop");
    if (code !== 0) {
      throw new Error(`Astro stop failed (${code})`);
    }
    active = false;
  };

  const refreshOnce = async () => {
    const current = revision;
    if (delayMs > 0) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, delayMs);
        wake = () => {
          clearTimeout(timer);
          resolve();
        };
      });
      wake = undefined;
    }
    if (closed || current !== revision) {
      return;
    }
    const prepared = await options.prepare();
    if (closed || current !== revision) {
      return;
    }
    const config = prepared.validation.config;
    if (!(prepared.validation.ok && config)) {
      options.printDiagnostics([
        ...prepared.collectDiagnostics,
        ...prepared.validation.diagnostics,
      ]);
      return;
    }
    const ogImages = await options.writeOgImages({
      workDir: options.params.workDir,
      config,
      entries: prepared.validation.entries,
      publicFiles: prepared.publicFiles,
      includeDrafts: options.params.includeDrafts,
    });
    if (closed || current !== revision) {
      return;
    }
    options.printDiagnostics([
      ...prepared.collectDiagnostics,
      ...prepared.validation.diagnostics,
      ...ogImages.diagnostics,
    ]);
    const params = {
      ...options.params,
      config,
      hasReactComponents: hasReactComponents(prepared.validation.outputs),
      publicFiles: [
        ...new Set([
          ...prepared.publicFiles,
          ...Object.values(ogImages.manifest),
        ]),
      ].sort(),
      headScripts: siteHeadScripts(
        config,
        options.params.mount,
        prepared.customScripts,
        false
      ),
    };
    const snapshot = JSON.stringify(params);
    if (snapshot === published && active) {
      return;
    }
    await stopAstro();
    if (closed || current !== revision) {
      return;
    }
    const committed = await options.publish(
      params,
      () => !closed && current === revision
    );
    if (!committed) {
      return;
    }
    published = snapshot;
    if (closed || current !== revision) {
      return;
    }
    active = true;
    const code = await options.runAstro("dev");
    if (code !== 0) {
      await stopAstro();
      throw new Error(`Astro dev failed (${code})`);
    }
  };

  const drain = async () => {
    try {
      while (pending) {
        pending = false;
        if (closed) {
          break;
        }
        try {
          await refreshOnce();
        } catch (error) {
          if (!pending || closed) {
            throw error;
          }
          options.reportError(error);
        }
      }
      return active;
    } finally {
      running = undefined;
    }
  };

  return {
    refresh(debounceMs = 0): Promise<boolean> {
      if (closed) {
        return Promise.resolve(false);
      }
      revision += 1;
      pending = true;
      delayMs = debounceMs;
      wake?.();
      running ??= Promise.resolve().then(drain);
      return running;
    },
    shutdown(): Promise<void> {
      closed = true;
      revision += 1;
      pending = false;
      wake?.();
      stopping ??= (async () => {
        await running?.catch(() => undefined);
        await stopAstro();
      })();
      return stopping;
    },
  };
}
