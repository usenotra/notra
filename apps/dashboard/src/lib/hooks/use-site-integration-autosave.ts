import type { SiteIntegrationUpdate } from "@notra/sites-core/types/site-integrations";
import { useEffect, useState } from "react";

import { useSaveSiteIntegration } from "@/lib/hooks/use-site-integrations";
import type { SiteIntegrationAutosaveState } from "@/types/site-integrations";
import type { SiteScope } from "@/types/sites";
import { createSiteIntegrationAutosave } from "@/utils/site-integration-autosave";

export function useSiteIntegrationAutosave(
  scope: SiteScope,
  initial: SiteIntegrationUpdate
) {
  const save = useSaveSiteIntegration(scope);
  const [state, setState] = useState<SiteIntegrationAutosaveState>({
    status: "idle",
    dirty: false,
    hasIntegration: initial.settings !== null,
    error: undefined,
  });
  const [autosave] = useState(() =>
    createSiteIntegrationAutosave({
      initial,
      save: save.mutateAsync,
      onChange: setState,
    })
  );

  useEffect(() => autosave.clearTimer, [autosave]);
  useEffect(() => {
    if (!state.dirty) {
      return;
    }
    const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [state.dirty]);

  return { ...autosave, state };
}
