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
import type { ReactElement } from "react";

import {
  getOrganizationMembershipActionDescription,
  getOrganizationMembershipActionLabel,
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
  const actionLabel = getOrganizationMembershipActionLabel(action);

  return (
    <ResponsiveAlertDialog>
      <ResponsiveAlertDialogTrigger render={trigger} />
      <ResponsiveAlertDialogContent>
        <ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogTitle className="wrap-anywhere">
            {actionLabel} {organizationName}?
          </ResponsiveAlertDialogTitle>
          <ResponsiveAlertDialogDescription>
            {getOrganizationMembershipActionDescription(
              action,
              hasOtherMembers
            )}
          </ResponsiveAlertDialogDescription>
        </ResponsiveAlertDialogHeader>
        <ResponsiveAlertDialogFooter>
          <ResponsiveAlertDialogCancel>Cancel</ResponsiveAlertDialogCancel>
          <ResponsiveAlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            {actionLabel} Organization
          </ResponsiveAlertDialogAction>
        </ResponsiveAlertDialogFooter>
      </ResponsiveAlertDialogContent>
    </ResponsiveAlertDialog>
  );
}
