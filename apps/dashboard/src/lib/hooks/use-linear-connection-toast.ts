"use client";

import { parseAsBoolean, parseAsString, useQueryStates } from "nuqs";
import { useEffect } from "react";
import { toast } from "sonner";

export function useLinearConnectionToast() {
  const [{ linearConnected, error }, setParams] = useQueryStates(
    { linearConnected: parseAsBoolean, error: parseAsString },
    { history: "replace" }
  );

  useEffect(() => {
    if (linearConnected) {
      toast.success("Linear workspace connected successfully");
      void setParams({ linearConnected: null, error: null });
    } else if (error === "workspace_already_connected") {
      toast.error("This Linear workspace is already connected");
      void setParams({ linearConnected: null, error: null });
    }
  }, [linearConnected, error, setParams]);
}
