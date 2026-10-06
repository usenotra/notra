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
import { Spinner } from "@notra/ui/components/ui/spinner";
import { useQuery } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { authClient } from "@/lib/auth/client";
import { useRouter } from "@/lib/navigation";
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
  const t = useTranslations("settings.deleteAccount");
  const tCommon2 = useTranslations("common");
  const tCommon = useTranslations("common.actions");
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
          toast.error(t("processOrgsFailed"));
          setIsDeleting(false);
          return;
        }
      }

      const result = await authClient.deleteUser();

      deleteError = result.error;
    } catch (error) {
      console.error("Delete account error:", error);
      toast.error(t("deleteFailed"));
      setIsDeleting(false);
      return;
    }
    if (deleteError) {
      toast.error(deleteError.message ?? t("deleteFailed"));
      setIsDeleting(false);
      return;
    }
    toast.success(t("deleted"));
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
            {tCommon2("labels.deleteAccount")}
          </ResponsiveAlertDialogTitle>
          <ResponsiveAlertDialogDescription>
            {t("dialogDescription")}
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
                    {t("ownsOrgsWithMembers")}
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
                            {tCommon2("messages.countPluralOneMemberOther", {
                              count: org.memberCount,
                            })}
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
                            {org.nextOwnerCandidate
                              ? t.rich("transferOwnershipTo", {
                                  name: org.nextOwnerCandidate.name,
                                  role: org.nextOwnerCandidate.role,
                                  muted: (chunks) => (
                                    <span className="text-muted-foreground">
                                      {chunks}
                                    </span>
                                  ),
                                })
                              : t("transferOwnership")}
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
                            {t("deleteThisOrganization")}
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
                    {t("orgsWillBeDeleted")}
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
                        {t("onlyYou")}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-muted-foreground text-xs">
                  {t("soleMemberNote")}
                </p>
              </div>
            )}

            {ownedOrganizations.length === 0 && (
              <p className="text-muted-foreground py-2 text-sm">
                {t("noOrgsNote")}
              </p>
            )}
          </div>
        )}

        <ResponsiveAlertDialogFooter>
          <ResponsiveAlertDialogCancel disabled={isDeleting}>
            {tCommon("cancel")}
          </ResponsiveAlertDialogCancel>
          <ResponsiveAlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isDeleting || isLoadingOrgs || !canProceed}
            onClick={handleDeleteAccount}
          >
            {isDeleting ? (
              <>
                <Spinner />
                {tCommon("deleting")}
              </>
            ) : (
              tCommon2("labels.deleteAccount")
            )}
          </ResponsiveAlertDialogAction>
        </ResponsiveAlertDialogFooter>
      </ResponsiveAlertDialogContent>
    </ResponsiveAlertDialog>
  );
}
