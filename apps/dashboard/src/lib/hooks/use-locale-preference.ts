"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { authClient } from "@/lib/auth/client";
import { useRouter } from "@/lib/navigation";
import type { LocalePreference } from "@/types/i18n";
import { isDashboardLocale } from "@/utils/i18n";

export function useLocalePreference() {
  const router = useRouter();
  const t = useTranslations("settings.language");
  const { data: session, refetch } = authClient.useSession();
  const stored = session?.user.locale;
  const preference: LocalePreference = isDashboardLocale(stored)
    ? stored
    : null;

  const mutation = useMutation({
    mutationFn: async (value: LocalePreference) => {
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
    preference: mutation.isPending ? (mutation.variables ?? null) : preference,
    isUpdating: mutation.isPending,
    setPreference: (value: LocalePreference) => mutation.mutate(value),
  };
}
