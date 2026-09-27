"use client";

import {
  Cancel01Icon,
  MailSend01Icon,
  MoreVerticalIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ResponsiveAlertDialog,
  ResponsiveAlertDialogAction,
  ResponsiveAlertDialogCancel,
  ResponsiveAlertDialogContent,
  ResponsiveAlertDialogDescription,
  ResponsiveAlertDialogFooter,
  ResponsiveAlertDialogHeader,
  ResponsiveAlertDialogTitle,
} from "@notra/ui/components/shared/responsive-alert-dialog";
import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { authClient } from "@/lib/auth/client";
import { isTeamMemberLimitError } from "@/lib/billing/limits";
import type { InvitationSummary } from "@/types/organizations/actions";

interface InvitationActionsProps {
  invitation: InvitationSummary;
}

export function InvitationActions({ invitation }: InvitationActionsProps) {
  const t = useTranslations("members.invitationActions");
  const tMembersShared = useTranslations("members.shared");
  const tMembers = useTranslations("members");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const { activeOrganization } = useOrganizationsContext();
  const router = useRouter();

  const [isResending, setIsResending] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [showResendDialog, setShowResendDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  if (!activeOrganization) {
    return null;
  }

  async function handleResendInvitation() {
    if (!activeOrganization) {
      return;
    }

    setIsResending(true);
    try {
      const { error } = await authClient.organization.resendInvitation({
        invitationId: invitation.id,
      });

      if (error) {
        const message = error.message || t("resendFailed");

        if (isTeamMemberLimitError(error.code)) {
          toast.error(message, {
            action: {
              label: tMembers("viewPlans"),
              onClick: () =>
                router.push(`/${activeOrganization.slug}/settings/billing`),
            },
          });
          setIsResending(false);
          return;
        }

        toast.error(message);
        setIsResending(false);
        return;
      }

      toast.success(t("resent", { email: invitation.email }));

      await queryClient.invalidateQueries({
        queryKey: ["invitations", activeOrganization.id],
      });

      setShowResendDialog(false);
    } catch (error) {
      console.error("Error resending invitation:", error);
      toast.error(t("resendFailed"));
    }
    setIsResending(false);
  }

  async function handleCancelInvitation() {
    if (!activeOrganization) {
      return;
    }

    setIsCanceling(true);
    try {
      const { error } = await authClient.organization.cancelInvitation({
        invitationId: invitation.id,
      });

      if (error) {
        if (error.message) {
          toast.error(error.message);
        } else {
          toast.error(t("cancelFailed"));
        }
        setIsCanceling(false);
        return;
      }

      toast.success(t("canceled", { email: invitation.email }));

      await queryClient.invalidateQueries({
        queryKey: ["invitations", activeOrganization.id],
      });

      setShowCancelDialog(false);
    } catch (error) {
      console.error("Error canceling invitation:", error);
      toast.error(t("cancelFailed"));
    }
    setIsCanceling(false);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button className="size-8 p-0" variant="ghost">
              <span className="sr-only">{tCommon("labels.openMenu")}</span>
              <HugeiconsIcon className="size-4" icon={MoreVerticalIcon} />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            disabled={isResending || isCanceling}
            onClick={() => setShowResendDialog(true)}
          >
            <HugeiconsIcon className="mr-2 size-4" icon={MailSend01Icon} />
            {tMembersShared("resendInvitation")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isResending || isCanceling}
            onClick={() => setShowCancelDialog(true)}
            variant="destructive"
          >
            <HugeiconsIcon className="mr-2 size-4" icon={Cancel01Icon} />
            {tMembersShared("cancelInvitation")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ResponsiveDialog
        onOpenChange={(open) => {
          if (!isResending) {
            setShowResendDialog(open);
          }
        }}
        open={showResendDialog}
      >
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{t("resendTitle")}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription className="wrap-anywhere">
              {t.rich("resendDescription", {
                email: invitation.email,
                strong: (chunks) => (
                  <span className="font-semibold underline">{chunks}</span>
                ),
              })}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogFooter>
            <ResponsiveDialogClose
              disabled={isResending}
              render={<Button variant="outline" />}
            >
              {tCommon("actions.cancel")}
            </ResponsiveDialogClose>
            <Button disabled={isResending} onClick={handleResendInvitation}>
              {isResending
                ? t("resending")
                : tMembersShared("resendInvitation")}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <ResponsiveAlertDialog
        onOpenChange={(open) => {
          if (!isCanceling) {
            setShowCancelDialog(open);
          }
        }}
        open={showCancelDialog}
      >
        <ResponsiveAlertDialogContent>
          <ResponsiveAlertDialogHeader>
            <ResponsiveAlertDialogTitle>
              {t("cancelTitle")}
            </ResponsiveAlertDialogTitle>
            <ResponsiveAlertDialogDescription className="wrap-anywhere">
              {t("cancelDescription", { email: invitation.email })}
            </ResponsiveAlertDialogDescription>
          </ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogFooter>
            <ResponsiveAlertDialogCancel disabled={isCanceling}>
              {tCommon("actions.cancel")}
            </ResponsiveAlertDialogCancel>
            <ResponsiveAlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isCanceling}
              onClick={handleCancelInvitation}
            >
              {isCanceling
                ? t("canceling")
                : tMembersShared("cancelInvitation")}
            </ResponsiveAlertDialogAction>
          </ResponsiveAlertDialogFooter>
        </ResponsiveAlertDialogContent>
      </ResponsiveAlertDialog>
    </>
  );
}
