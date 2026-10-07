"use client";

import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs";
import { useEffect } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

export function useLinearConnectionToast() {
  const t = useTranslations("integrations.connectionToasts");
  const [{ linearConnected, error }, setParams] = useQueryStates(
    { linearConnected: parseAsBoolean, error: parseAsString },
    { history: "replace" }
  );

  useEffect(() => {
    if (linearConnected) {
      toast.success(t("linearConnected"));
      void setParams({ linearConnected: null, error: null });
    } else if (error === "workspace_already_connected") {
      toast.error(t("linearAlreadyConnected"));
      void setParams({ linearConnected: null, error: null });
    }
  }, [linearConnected, error, setParams, t]);
}
