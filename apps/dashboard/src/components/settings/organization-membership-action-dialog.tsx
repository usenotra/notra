"use client";

import {
  ResponsiveAlertDialog,
  ResponsiveAlertDialogAction,
  ResponsiveAlertDialogCancel,
  ResponsiveAlertDialogContent,
  ResponsiveAlertDialogDescription,
  ResponsiveAlertDialogFooter,
  ResponsiveAlertDialogHeader,
  ResponsiveAlertDialogTitle,
  ResponsiveAlertDialogTrigger,
} from "@notra/ui/components/shared/responsive-alert-dialog";
import { useTranslations } from "next-intl";
import type { ReactElement } from "react";

import {
  getOrganizationMembershipActionDescriptionKey,
  type OrganizationMembershipAction,
} from "@/lib/organizations/membership-action";

interface OrganizationMembershipActionDialogProps {
  organizationName: string;
  action: OrganizationMembershipAction;
  hasOtherMembers: boolean;
  onConfirm: () => void;
  trigger: ReactElement;
}

export function OrganizationMembershipActionDialog({
  organizationName,
  action,
  hasOtherMembers,
  onConfirm,
  trigger,
}: OrganizationMembershipActionDialogProps) {
  const t = useTranslations("settings.membershipAction");
  const tCommon = useTranslations("common.actions");

  return (
    <ResponsiveAlertDialog>
      <ResponsiveAlertDialogTrigger render={trigger} />
      <ResponsiveAlertDialogContent>
        <ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogTitle className="wrap-anywhere">
            {t("title", { action, name: organizationName })}
          </ResponsiveAlertDialogTitle>
          <ResponsiveAlertDialogDescription>
            {t(
              getOrganizationMembershipActionDescriptionKey(
                action,
                hasOtherMembers
              )
            )}
          </ResponsiveAlertDialogDescription>
        </ResponsiveAlertDialogHeader>
        <ResponsiveAlertDialogFooter>
          <ResponsiveAlertDialogCancel>
            {tCommon("cancel")}
          </ResponsiveAlertDialogCancel>
          <ResponsiveAlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            {t("confirm", { action })}
          </ResponsiveAlertDialogAction>
        </ResponsiveAlertDialogFooter>
      </ResponsiveAlertDialogContent>
    </ResponsiveAlertDialog>
  );
}
