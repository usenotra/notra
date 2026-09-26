"use client";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { useRouter } from "next/navigation";

import type { AccountModalProps } from "@/types/analytics";

export function AccountModal({ title, children }: AccountModalProps) {
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
            Engagement and recent posts for @{title}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        {children}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
