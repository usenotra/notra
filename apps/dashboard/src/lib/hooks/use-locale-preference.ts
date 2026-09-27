"use client";

import { useMutation } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { authClient } from "@/lib/auth/client";
import type { DashboardLocale } from "@/types/i18n";

export function useLocalePreference() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("settings.language");
  const { refetch } = authClient.useSession();

  const mutation = useMutation({
    mutationFn: async (value: DashboardLocale) => {
      const { error } = await authClient.updateUser({ locale: value });
      if (error) {
        throw new Error(error.message ?? t("updateFailed"));
      }
      await refetch();
      return value;
    },
    onSuccess: () => router.refresh(),
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("updateFailed"));
    },
  });

  return {
    locale:
      mutation.isPending && mutation.variables ? mutation.variables : locale,
    isUpdating: mutation.isPending,
    setLocale: (value: DashboardLocale) => mutation.mutate(value),
  };
}
