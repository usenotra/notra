"use client";

import { CreditCardIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Confetti } from "@neoconfetti/react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { useTranslations } from "use-intl";

import { CreditTopupContent } from "@/components/billing/credit-topup-content";
import { Button } from "@/components/button";

interface CreditTopupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  success?: boolean;
  onSuccess?: () => void;
}

export function CreditTopupModal({
  open,
  onOpenChange,
  success,
  onSuccess,
}: CreditTopupModalProps) {
  const t = useTranslations("billing.topup");
  const tCommon2 = useTranslations("common");
  const tCommon = useTranslations("common.actions");
  if (success) {
    return (
      <ResponsiveDialog onOpenChange={onOpenChange} open={open}>
        <ResponsiveDialogContent className="sm:max-w-md">
          <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2">
            <Confetti
              colors={[
                "var(--primary)",
                "#FFC700",
                "#FF6B6B",
                "#41BBC7",
                "#A78BFA",
                "#34D399",
              ]}
              duration={3000}
              force={0.5}
              particleCount={120}
              particleShape="mix"
              particleSize={8}
              stageHeight={600}
              stageWidth={800}
            />
          </div>
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <HugeiconsIcon className="text-success size-12" icon={Tick02Icon} />
            <div className="space-y-1">
              <h2 className="text-xl font-bold">
                {tCommon2("labels.creditsAdded")}
              </h2>
              <p className="text-muted-foreground text-sm">
                {tCommon2("messages.yourAiCreditsHaveBeen")}
              </p>
            </div>
            <Button
              className="mt-2"
              onClick={() => onOpenChange(false)}
              size="sm"
            >
              {tCommon("continue")}
            </Button>
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    );
  }

  return (
    <ResponsiveDialog onOpenChange={onOpenChange} open={open}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <HugeiconsIcon className="size-5" icon={CreditCardIcon} />
            {tCommon2("labels.topUpCredits")}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t("description")}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <CreditTopupContent
          onSuccess={onSuccess ?? (() => onOpenChange(false))}
        />
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
