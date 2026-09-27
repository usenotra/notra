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
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { authClient } from "@/lib/auth/client";
import {
  isTeamMemberLimitError,
  mapBillingLimitErrorMessage,
} from "@/lib/billing/limits";
import type { InvitationSummary } from "@/types/organizations/actions";

interface InvitationActionsProps {
  invitation: InvitationSummary;
}

export function InvitationActions({ invitation }: InvitationActionsProps) {
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
        const message = mapBillingLimitErrorMessage(
          error.message,
          "Failed to resend invitation"
        );

        if (isTeamMemberLimitError(error.message)) {
          toast.error(message, {
            action: {
              label: "View plans",
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

      toast.success(`Invitation resent to ${invitation.email}`);

      await queryClient.invalidateQueries({
        queryKey: ["invitations", activeOrganization.id],
      });

      setShowResendDialog(false);
    } catch (error) {
      console.error("Error resending invitation:", error);
      toast.error("Failed to resend invitation");
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
          toast.error("Failed to cancel invitation");
        }
        setIsCanceling(false);
        return;
      }

      toast.success(`Invitation to ${invitation.email} has been canceled`);

      await queryClient.invalidateQueries({
        queryKey: ["invitations", activeOrganization.id],
      });

      setShowCancelDialog(false);
    } catch (error) {
      console.error("Error canceling invitation:", error);
      toast.error("Failed to cancel invitation");
    }
    setIsCanceling(false);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button className="size-8 p-0" variant="ghost">
              <span className="sr-only">Open menu</span>
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
            Resend invitation
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isResending || isCanceling}
            onClick={() => setShowCancelDialog(true)}
            variant="destructive"
          >
            <HugeiconsIcon className="mr-2 size-4" icon={Cancel01Icon} />
            Cancel invitation
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
            <ResponsiveDialogTitle>Resend invitation?</ResponsiveDialogTitle>
            <ResponsiveDialogDescription className="wrap-anywhere">
              This will resend the invitation email to{" "}
              <span className="font-semibold underline">
                {invitation.email}
              </span>
              . They will receive a new invitation link.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogFooter>
            <ResponsiveDialogClose
              disabled={isResending}
              render={<Button variant="outline" />}
            >
              Cancel
            </ResponsiveDialogClose>
            <Button disabled={isResending} onClick={handleResendInvitation}>
              {isResending ? "Resending..." : "Resend Invitation"}
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
              Cancel invitation?
            </ResponsiveAlertDialogTitle>
            <ResponsiveAlertDialogDescription className="wrap-anywhere">
              This will cancel the invitation sent to {invitation.email}. They
              will no longer be able to accept this invitation.
            </ResponsiveAlertDialogDescription>
          </ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogFooter>
            <ResponsiveAlertDialogCancel disabled={isCanceling}>
              Cancel
            </ResponsiveAlertDialogCancel>
            <ResponsiveAlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isCanceling}
              onClick={handleCancelInvitation}
            >
              {isCanceling ? "Canceling..." : "Cancel Invitation"}
            </ResponsiveAlertDialogAction>
          </ResponsiveAlertDialogFooter>
        </ResponsiveAlertDialogContent>
      </ResponsiveAlertDialog>
    </>
  );
}
