"use client";

import { ConfirmDialog } from "@notra/ui/components/shared/confirm-dialog";
import type { ReactElement } from "react";
import { useTranslations } from "use-intl";

import {
  getOrganizationMembershipActionDescriptionKey,
  type OrganizationMembershipAction,
} from "@/lib/organizations/membership-action";

interface OrganizationMembershipActionDialogProps {
  organizationName: string;
  action: OrganizationMembershipAction;
  hasOtherMembers: boolean;
  onConfirm: () => void | Promise<unknown>;
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

  return (
    <ConfirmDialog
      confirmLabel={t("confirm", { action })}
      description={t(
        getOrganizationMembershipActionDescriptionKey(action, hasOtherMembers)
      )}
      onConfirm={onConfirm}
      title={t("title", { action, name: organizationName })}
      trigger={trigger}
      variant="destructive"
    />
  );
}
