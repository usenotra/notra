import type { SiteIntegrationUpdate } from "@notra/sites-core/types/site-integrations";
import { useBlocker } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { useSaveSiteIntegration } from "@/lib/hooks/use-site-integrations";
import { useWarnBeforeUnload } from "@/lib/hooks/use-warn-before-unload";
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

  useEffect(
    () => () => {
      void autosave.flush();
    },
    [autosave]
  );
  useWarnBeforeUnload(state.dirty);
  useBlocker({
    disabled: !state.dirty,
    enableBeforeUnload: false,
    shouldBlockFn: async () => !(await autosave.flush()),
  });

  return { ...autosave, state };
}
