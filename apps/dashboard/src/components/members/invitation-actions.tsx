"use client";

import {
  Cancel01Icon,
  MailSend01Icon,
  MoreVerticalIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@notra/ui/components/ui/alert-dialog";
import { Button } from "@notra/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import type { Invitation } from "better-auth/plugins/organization";
import { useState } from "react";
import { toast } from "sonner";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { authClient } from "@/lib/auth/client";

interface InvitationActionsProps {
  invitation: Invitation;
}

export function InvitationActions({ invitation }: InvitationActionsProps) {
  const queryClient = useQueryClient();
  const { activeOrganization } = useOrganizationsContext();

  const [isResending, setIsResending] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [showResendDialog, setShowResendDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  if (!activeOrganization) {
    return null;
  }

  async function handleResendInvitation() {
    if (!activeOrganization) return;

    setIsResending(true);
    try {
      const { error } = await authClient.organization.inviteMember({
        email: invitation.email,
        role: invitation.role as "member" | "owner" | "admin",
        organizationId: activeOrganization.id,
        resend: true,
      });

      if (error) {
        toast.error(error.message || "Failed to resend invitation");
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
    } finally {
      setIsResending(false);
    }
  }

  async function handleCancelInvitation() {
    if (!activeOrganization) return;

    setIsCanceling(true);
    try {
      const { error } = await authClient.organization.cancelInvitation({
        invitationId: invitation.id,
      });

      if (error) {
        toast.error(error.message || "Failed to cancel invitation");
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
    } finally {
      setIsCanceling(false);
    }
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

      <AlertDialog
        onOpenChange={(open) => {
          if (!isResending) {
            setShowResendDialog(open);
          }
        }}
        open={showResendDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resend invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will resend the invitation email to{" "}
              <span className="font-semibold underline">
                {invitation.email}
              </span>
              . They will receive a new invitation link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isResending}
              onClick={handleResendInvitation}
            >
              {isResending ? "Resending..." : "Resend Invitation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        onOpenChange={(open) => {
          if (!isCanceling) {
            setShowCancelDialog(open);
          }
        }}
        open={showCancelDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the invitation sent to {invitation.email}. They
              will no longer be able to accept this invitation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCanceling}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isCanceling}
              onClick={handleCancelInvitation}
            >
              {isCanceling ? "Canceling..." : "Cancel Invitation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
