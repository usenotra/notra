"use client";

import { Alert01Icon, Building06Icon } from "@hugeicons/core-free-icons";
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
  ResponsiveAlertDialogTrigger,
} from "@notra/ui/components/shared/responsive-alert-dialog";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@notra/ui/components/ui/avatar";
import { Label } from "@notra/ui/components/ui/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@notra/ui/components/ui/radio-group";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactElement } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth/client";
import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  DeleteAccountDialogProps,
  OwnedOrganization,
  TransferDecision,
} from "@/types/settings/delete-account";

export function DeleteAccountDialog({
  trigger,
  open,
  onOpenChange,
}: DeleteAccountDialogProps): ReactElement {
  const router = useRouter();
  const invalidateSession = authClient.useSessionInvalidation();
  const [internalOpen, setInternalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [decisions, setDecisions] = useState<
    Record<string, "transfer" | "delete">
  >({});

  const isControlled = open !== undefined;
  const isDialogOpen = isControlled ? open : internalOpen;

  const { data: ownedOrgsData, isLoading: isLoadingOrgs } = useQuery({
    ...dashboardOrpc.user.organizations.listOwned.queryOptions({
      enabled: isDialogOpen,
      select: (data) => data.ownedOrganizations as OwnedOrganization[],
    }),
    enabled: isDialogOpen,
  });

  const ownedOrganizations = ownedOrgsData ?? [];
  const orgsWithOtherMembers = ownedOrganizations.filter(
    (org) => org.memberCount > 1
  );
  const soleOwnerOrgs = ownedOrganizations.filter(
    (org) => org.memberCount === 1
  );

  const allDecisionsMade = orgsWithOtherMembers.every(
    (org) => decisions[org.id]
  );
  const canProceed = orgsWithOtherMembers.length === 0 || allDecisionsMade;

  function handleDecisionChange(orgId: string, action: "transfer" | "delete") {
    setDecisions((prev) => ({
      ...prev,
      [orgId]: action,
    }));
  }

  async function handleDeleteAccount() {
    setIsDeleting(true);
    let deleteError: { message?: string | null } | null = null;
    try {
      if (ownedOrganizations.length > 0) {
        const transfers: TransferDecision[] = [
          ...orgsWithOtherMembers.map((org) => ({
            orgId: org.id,
            action: decisions[org.id] || ("delete" as const),
          })),
          ...soleOwnerOrgs.map((org) => ({
            orgId: org.id,
            action: "delete" as const,
          })),
        ];

        try {
          await dashboardOrpc.user.deleteWithTransfers.call({
            transfers,
          });
        } catch (fetchError) {
          console.error("Failed to process organizations:", fetchError);
          toast.error("Failed to process organizations. Please try again.");
          setIsDeleting(false);
          return;
        }
      }

      const result = await authClient.deleteUser();

      deleteError = result.error;
    } catch (error) {
      console.error("Delete account error:", error);
      toast.error("Failed to delete account");
      setIsDeleting(false);
      return;
    }
    if (deleteError) {
      toast.error(deleteError.message ?? "Failed to delete account");
      setIsDeleting(false);
      return;
    }
    toast.success("Account deleted successfully");
    handleOpenChange(false);
    invalidateSession();
    router.push("/login");
    setIsDeleting(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (isControlled) {
      onOpenChange?.(nextOpen);
    } else {
      setInternalOpen(nextOpen);
    }
    if (!nextOpen) {
      setDecisions({});
    }
  }

  return (
    <ResponsiveAlertDialog onOpenChange={handleOpenChange} open={isDialogOpen}>
      {trigger ? <ResponsiveAlertDialogTrigger render={trigger} /> : null}
      <ResponsiveAlertDialogContent className="max-w-lg">
        <ResponsiveAlertDialogHeader>
          <ResponsiveAlertDialogTitle>
            Delete Account
          </ResponsiveAlertDialogTitle>
          <ResponsiveAlertDialogDescription>
            You're about to delete your account. This action cannot be undone.
          </ResponsiveAlertDialogDescription>
        </ResponsiveAlertDialogHeader>

        {isLoadingOrgs ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {orgsWithOtherMembers.length > 0 && (
              <div className="space-y-3">
                <div className="text-warning flex items-center gap-2">
                  <HugeiconsIcon icon={Alert01Icon} size={18} />
                  <p className="text-sm font-medium">
                    You own organizations with other members:
                  </p>
                </div>

                <div className="space-y-3">
                  {orgsWithOtherMembers.map((org) => (
                    <div
                      className="space-y-3 rounded-lg border p-4"
                      key={org.id}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8 shrink-0 rounded-lg after:rounded-lg">
                          <AvatarImage
                            alt={org.name}
                            className="rounded-lg"
                            src={org.logo ?? undefined}
                          />
                          <AvatarFallback className="rounded-lg text-sm">
                            {org.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p
                            className="truncate text-sm font-medium"
                            title={org.name}
                          >
                            {org.name}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {org.memberCount} member
                            {org.memberCount !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>

                      <RadioGroup
                        onValueChange={(value) =>
                          handleDecisionChange(
                            org.id,
                            value as "transfer" | "delete"
                          )
                        }
                        value={decisions[org.id] ?? ""}
                      >
                        <div className="flex items-start gap-2">
                          <RadioGroupItem
                            id={`transfer-${org.id}`}
                            value="transfer"
                          />
                          <Label
                            className="min-w-0 cursor-pointer text-sm leading-tight font-normal wrap-anywhere"
                            htmlFor={`transfer-${org.id}`}
                          >
                            Transfer ownership
                            {org.nextOwnerCandidate && (
                              <span className="text-muted-foreground">
                                {" "}
                                to {org.nextOwnerCandidate.name} (
                                {org.nextOwnerCandidate.role})
                              </span>
                            )}
                          </Label>
                        </div>
                        <div className="flex items-start gap-2">
                          <RadioGroupItem
                            id={`delete-${org.id}`}
                            value="delete"
                          />
                          <Label
                            className="text-destructive cursor-pointer text-sm leading-tight font-normal"
                            htmlFor={`delete-${org.id}`}
                          >
                            Delete this organization
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {soleOwnerOrgs.length > 0 && (
              <div className="space-y-3">
                <div className="text-muted-foreground flex items-center gap-2">
                  <HugeiconsIcon icon={Building06Icon} size={18} />
                  <p className="text-sm font-medium">
                    These organizations will be deleted:
                  </p>
                </div>

                <div className="space-y-2 rounded-lg border border-dashed p-3">
                  {soleOwnerOrgs.map((org) => (
                    <div className="flex items-center gap-2" key={org.id}>
                      <Avatar className="size-6 shrink-0 rounded after:rounded">
                        <AvatarImage
                          alt={org.name}
                          className="rounded"
                          src={org.logo ?? undefined}
                        />
                        <AvatarFallback className="rounded text-xs">
                          {org.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <p className="min-w-0 truncate text-sm" title={org.name}>
                        {org.name}
                      </p>
                      <span className="text-muted-foreground shrink-0 text-xs">
                        (only you)
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-muted-foreground text-xs">
                  You are the only member of these organizations. They will be
                  permanently deleted with your account.
                </p>
              </div>
            )}

            {ownedOrganizations.length === 0 && (
              <p className="text-muted-foreground py-2 text-sm">
                This will permanently delete your account and remove your data
                from our servers.
              </p>
            )}
          </div>
        )}

        <ResponsiveAlertDialogFooter>
          <ResponsiveAlertDialogCancel disabled={isDeleting}>
            Cancel
          </ResponsiveAlertDialogCancel>
          <ResponsiveAlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isDeleting || isLoadingOrgs || !canProceed}
            onClick={handleDeleteAccount}
          >
            {isDeleting ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Account"
            )}
          </ResponsiveAlertDialogAction>
        </ResponsiveAlertDialogFooter>
      </ResponsiveAlertDialogContent>
    </ResponsiveAlertDialog>
  );
}
