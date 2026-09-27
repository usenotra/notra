"use client";

import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Label } from "@notra/ui/components/ui/label";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { useMutation } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { authClient } from "@/lib/auth/client";
import { errorMessageOr } from "@/lib/utils";
import type { LoginDetailsSectionProps } from "@/types/settings/account";

export function LoginDetailsSection({
  email,
  hasPasswordAccount,
}: LoginDetailsSectionProps) {
  const t = useTranslations("settings.loginDetails");
  const tCommon = useTranslations("common");
  // react-doctor-disable-next-line query-mutation-missing-invalidation
  const passwordResetMutation = useMutation({
    mutationFn: async () => {
      const result = await authClient.requestPasswordReset();

      if (result.error) {
        throw new Error(errorMessageOr(result.error.message, t("resetFailed")));
      }

      return result.data;
    },
    onSuccess: () => {
      toast.success(t("resetSent"));
    },
    onError: (error) => {
      toast.error(errorMessageOr(error.message, t("resetFailed")));
    },
  });

  return (
    <TitleCard heading={t("heading")}>
      <div className="space-y-6">
        <div className="space-y-2">
          <Label>{tCommon("labels.email")}</Label>
          <div className="flex items-center gap-2">
            <div
              className="bg-muted/50 flex-1 truncate rounded-lg border px-3 py-2 text-sm"
              title={email}
            >
              {email}
            </div>
            <HugeiconsIcon
              className="text-success shrink-0"
              icon={CheckmarkCircle02Icon}
              size={20}
            />
          </div>
          <p className="text-muted-foreground text-xs">{t("emailHint")}</p>
        </div>

        {hasPasswordAccount && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium">{tCommon("labels.password")}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              {t("passwordHint")}
            </p>
            <Button
              className="mt-4"
              disabled={passwordResetMutation.isPending}
              onClick={() => passwordResetMutation.mutate()}
            >
              {passwordResetMutation.isPending ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  {t("sending")}
                </>
              ) : (
                t("sendReset")
              )}
            </Button>
          </div>
        )}
      </div>
    </TitleCard>
  );
}
