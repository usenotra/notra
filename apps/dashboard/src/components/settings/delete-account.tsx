"use client";

import { Alert01Icon, Building06Icon } from "@hugeicons/core-free-icons";
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
  AlertDialogTrigger,
} from "@notra/ui/components/ui/alert-dialog";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@notra/ui/components/ui/avatar";
import { Button } from "@notra/ui/components/ui/button";
import { Label } from "@notra/ui/components/ui/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@notra/ui/components/ui/radio-group";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { TitleCard } from "@/components/title-card";
import { authClient } from "@/lib/auth/client";

interface OwnedOrganization {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  memberCount: number;
  nextOwnerCandidate: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

interface TransferDecision {
  orgId: string;
  action: "transfer" | "delete";
}

export function DeleteAccountSection() {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [decisions, setDecisions] = useState<
    Record<string, "transfer" | "delete">
  >({});

  const { data: ownedOrgsData, isLoading: isLoadingOrgs } = useQuery({
    queryKey: ["user", "owned-organizations"],
    queryFn: async () => {
      const response = await fetch("/api/user/organizations");
      if (!response.ok) {
        throw new Error("Failed to fetch organizations");
      }
      const data = await response.json();
      return data.ownedOrganizations as OwnedOrganization[];
    },
    enabled: isDialogOpen,
  });

  const ownedOrganizations = ownedOrgsData ?? [];
  const orgsWithOtherMembers = ownedOrganizations.filter(
    (org) => org.memberCount > 1
  );
  const soleOwnerOrgs = ownedOrganizations.filter(
    (org) => org.memberCount === 1
  );

  // Check if all orgs with other members have a decision
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
          const response = await fetch("/api/user/delete-with-transfers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transfers }),
          });

          if (!response.ok) {
            const error = await response.json();
            toast.error(error.error ?? "Failed to process organizations");
            setIsDeleting(false);
            return;
          }
        } catch (fetchError) {
          console.error("Failed to process organizations:", fetchError);
          toast.error("Failed to process organizations. Please try again.");
          setIsDeleting(false);
          return;
        }
      }

      const result = await authClient.deleteUser({
        callbackURL: "/",
      });

      if (result?.error) {
        toast.error(result.error.message ?? "Failed to delete account");
      } else {
        toast.success("Account deleted successfully");
        router.push("/");
      }
    } catch (error) {
      console.error("Delete account error:", error);
      toast.error("Failed to delete account");
    } finally {
      setIsDeleting(false);
    }
  }

  function handleOpenChange(open: boolean) {
    setIsDialogOpen(open);
    if (!open) {
      setDecisions({});
    }
  }

  return (
    <TitleCard
      className="border-destructive/50 bg-destructive/5 lg:col-span-2"
      heading="Delete Account"
    >
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Permanently remove your Personal Account and all of its contents from
          the Notra platform. This action is not reversible, so please continue
          with caution.
        </p>
        <div className="flex justify-end">
          <AlertDialog onOpenChange={handleOpenChange} open={isDialogOpen}>
            <AlertDialogTrigger
              render={
                <Button variant="destructive">Delete Personal Account</Button>
              }
            />
            <AlertDialogContent className="max-w-lg">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Account</AlertDialogTitle>
                <AlertDialogDescription>
                  You're about to delete your account. This action cannot be
                  undone.
                </AlertDialogDescription>
              </AlertDialogHeader>

              {isLoadingOrgs ? (
                <div className="space-y-3 py-4">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : (
                <div className="space-y-4 py-2">
                  {/* Organizations with other members */}
                  {orgsWithOtherMembers.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                        <HugeiconsIcon icon={Alert01Icon} size={18} />
                        <p className="font-medium text-sm">
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
                              <Avatar className="size-8 rounded-lg after:rounded-lg">
                                <AvatarImage
                                  alt={org.name}
                                  className="rounded-lg"
                                  src={org.logo ?? undefined}
                                />
                                <AvatarFallback className="rounded-lg text-sm">
                                  {org.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">
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
                                  className="cursor-pointer font-normal text-sm leading-tight"
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
                                  className="cursor-pointer font-normal text-destructive text-sm leading-tight"
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

                  {/* Sole owner organizations */}
                  {soleOwnerOrgs.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <HugeiconsIcon icon={Building06Icon} size={18} />
                        <p className="font-medium text-sm">
                          These organizations will be deleted:
                        </p>
                      </div>

                      <div className="space-y-2 rounded-lg border border-dashed p-3">
                        {soleOwnerOrgs.map((org) => (
                          <div className="flex items-center gap-2" key={org.id}>
                            <Avatar className="size-6 rounded after:rounded">
                              <AvatarImage
                                alt={org.name}
                                className="rounded"
                                src={org.logo ?? undefined}
                              />
                              <AvatarFallback className="rounded text-xs">
                                {org.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <p className="text-sm">{org.name}</p>
                            <span className="text-muted-foreground text-xs">
                              (only you)
                            </span>
                          </div>
                        ))}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        You are the only member of these organizations. They
                        will be permanently deleted with your account.
                      </p>
                    </div>
                  )}

                  {/* No owned organizations */}
                  {ownedOrganizations.length === 0 && (
                    <p className="py-2 text-muted-foreground text-sm">
                      This will permanently delete your account and remove your
                      data from our servers.
                    </p>
                  )}
                </div>
              )}

              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
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
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </TitleCard>
  );
}
