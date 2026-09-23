"use client";

import type { PendingAuthStep } from "@notra/schemas/types/dashboard/auth";
import { useState } from "react";

import type { ApplyAuthResult, UseAuthFlowOptions } from "../types/auth";

export function useAuthFlow({ initialPending, onSuccess }: UseAuthFlowOptions) {
  const [pending, setPending] = useState<PendingAuthStep | null>(
    initialPending ?? null
  );

  function finish(redirectTo: string) {
    if (onSuccess) {
      onSuccess();
    } else {
      window.location.assign(redirectTo);
    }
  }

  const applyResult: ApplyAuthResult = (result) => {
    switch (result.status) {
      case "success":
      case "enrolled":
        finish(result.redirectTo);
        return true;
      case "verification-required":
      case "mfa-required":
      case "mfa-enrollment-required":
        setPending(result);
        return true;
      default:
        return false;
    }
  };

  return {
    pending,
    applyResult,
    finish,
    reset: () => setPending(null),
  };
}
