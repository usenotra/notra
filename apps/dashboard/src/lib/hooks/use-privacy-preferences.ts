"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { authClient } from "@/lib/auth/client";

type PrivacyField = "hidePersonalData" | "showAgentStats";

function usePrivacyField(field: PrivacyField): {
  value: boolean;
  hasHydrated: boolean;
  isUpdating: boolean;
  setValue: (value: boolean) => void;
} {
  const t = useTranslations("settings.toasts");
  const { data: session, isPending, refetch } = authClient.useSession();

  const mutation = useMutation({
    mutationFn: async (value: boolean) => {
      const { error } = await authClient.updateUser({ [field]: value });
      if (error) {
        throw new Error(error.message ?? t("updatePreferenceFailed"));
      }
      await refetch();
      return value;
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : t("updatePreferenceFailedRetry")
      );
    },
  });

  const persisted = session?.user?.[field] ?? false;
  const optimistic =
    mutation.isPending && typeof mutation.variables === "boolean"
      ? mutation.variables
      : persisted;

  return {
    value: optimistic,
    hasHydrated: !isPending,
    isUpdating: mutation.isPending,
    setValue: (value: boolean) => mutation.mutate(value),
  };
}

export function useHidePersonalData(): {
  hidePersonalData: boolean;
  hasHydrated: boolean;
  isUpdating: boolean;
  setHidePersonalData: (value: boolean) => void;
} {
  const { value, hasHydrated, isUpdating, setValue } =
    usePrivacyField("hidePersonalData");
  return {
    hidePersonalData: value,
    hasHydrated,
    isUpdating,
    setHidePersonalData: setValue,
  };
}

export function useShowAgentStats(): {
  showAgentStats: boolean;
  hasHydrated: boolean;
  isUpdating: boolean;
  setShowAgentStats: (value: boolean) => void;
} {
  const { value, hasHydrated, isUpdating, setValue } =
    usePrivacyField("showAgentStats");
  return {
    showAgentStats: value,
    hasHydrated,
    isUpdating,
    setShowAgentStats: setValue,
  };
}
