import type { SiteIntegrationUpdate } from "@notra/sites-core/types/site-integrations";

import { SITE_INTEGRATION_AUTOSAVE_DELAY_MS } from "@/constants/site-integrations";
import type {
  SiteIntegrationAutosaveOptions,
  SiteIntegrationAutosaveState,
} from "@/types/site-integrations";

export function createSiteIntegrationAutosave(
  options: SiteIntegrationAutosaveOptions
) {
  let latest: SiteIntegrationUpdate | null = options.initial;
  let saved = JSON.stringify(options.initial);
  let hasIntegration = options.initial.settings !== null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running: Promise<boolean> | null = null;

  const notify = (
    status: SiteIntegrationAutosaveState["status"],
    error?: unknown
  ) =>
    options.onChange({
      status,
      dirty:
        status === "saving" ||
        latest === null ||
        JSON.stringify(latest) !== saved,
      hasIntegration,
      error,
    });

  const clearTimer = () => {
    clearTimeout(timer);
    timer = undefined;
  };

  const drain = async () => {
    for (;;) {
      const update = latest;
      if (!update || JSON.stringify(update) === saved) {
        break;
      }
      notify("saving");
      try {
        await options.save(update);
      } catch (error) {
        notify("error", error);
        return false;
      }
      saved = JSON.stringify(update);
      hasIntegration = update.settings !== null;
    }
    notify(latest ? "saved" : "pending");
    return latest !== null;
  };

  const flush = async (): Promise<boolean> => {
    clearTimer();
    if (running) {
      return await running;
    }
    if (!latest) {
      return false;
    }
    if (JSON.stringify(latest) === saved) {
      return true;
    }
    running = drain().finally(() => {
      running = null;
    });
    return await running;
  };

  return {
    update(update: SiteIntegrationUpdate | null) {
      clearTimer();
      latest = update;
      if (running) {
        notify("saving");
        return;
      }
      if (JSON.stringify(latest) === saved) {
        notify("saved");
        return;
      }
      notify("pending");
      if (latest) {
        timer = setTimeout(() => {
          void flush();
        }, SITE_INTEGRATION_AUTOSAVE_DELAY_MS);
      }
    },
    flush,
    async cancel() {
      clearTimer();
      latest = null;
      await running;
    },
    clearTimer,
  };
}
