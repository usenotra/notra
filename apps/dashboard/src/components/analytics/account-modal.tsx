"use client";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { useTranslations } from "use-intl";

import { useRouter } from "@/lib/navigation";
import type { AccountModalProps } from "@/types/analytics";

export function AccountModal({ title, children }: AccountModalProps) {
  const t = useTranslations("analytics.accountModal");
  const router = useRouter();

  return (
    <ResponsiveDialog
      onOpenChange={(open) => {
        if (!open) {
          router.back();
        }
      }}
      open
    >
      <ResponsiveDialogContent className="max-h-[90svh] gap-4 overflow-hidden p-6 sm:max-w-4xl [&>*]:min-w-0">
        <ResponsiveDialogHeader className="sr-only">
          <ResponsiveDialogTitle className="text-xl font-semibold">
            @{title}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="wrap-anywhere">
            {t("description", { handle: title })}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        {children}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
