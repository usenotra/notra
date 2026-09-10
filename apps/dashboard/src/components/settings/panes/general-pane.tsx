"use client";

import {
  Add01Icon,
  ArrowReloadHorizontalIcon,
  Cancel01Icon,
  Linkedin02Icon,
  NewTwitterIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@notra/ui/components/ui/avatar";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { XVerificationBadge } from "@/components/icons/x-verification-badge";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { DevSampleDataCard } from "@/components/settings/dev-sample-data-card";
import { OrganizationDetailsCard } from "@/components/settings/organization-details-card";
import { OrganizationMembershipActionDialog } from "@/components/settings/organization-membership-action-dialog";
import { SettingsPane } from "@/components/settings/settings-pane";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { authClient } from "@/lib/auth/client";
import {
  useConnectedAccounts,
  useDisconnectAccount,
  useHandleConnectSocialAccount,
  useRefreshConnectedAccount,
} from "@/lib/hooks/use-connected-accounts";
import { useSocialConnectCallbackToasts } from "@/lib/hooks/use-social-connect-callback-toasts";
import {
  getOrganizationMembershipActionLabel,
  type OrganizationMembershipAction,
} from "@/lib/organizations/membership-action";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { ConnectedAccountsGroupProps } from "@/types/settings/general";
import { setLastVisitedOrganization } from "@/utils/cookies";
import { QUERY_KEYS } from "@/utils/query-keys";
import { isSquareTwitterAvatar } from "@/utils/twitter";

export function GeneralSettingsPane() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeOrganization: organization, organizations } =
    useOrganizationsContext();
  const slug = organization?.slug ?? "";
  const [isRemovingOrganization, setIsRemovingOrganization] = useState(false);

  const {
    data: ownedOrganizations = [],
    isLoading: isLoadingOwnedOrganizations,
  } = useQuery({
    ...dashboardOrpc.user.organizations.listOwned.queryOptions({
      select: (data) =>
        (data.ownedOrganizations ?? []).map((org) => ({
          id: org.id,
          memberCount: org.memberCount,
        })),
    }),
  });

  const ownedOrganization = ownedOrganizations.find(
    (ownedOrg) => ownedOrg.id === organization?.id
  );
  const hasOtherMembers = (ownedOrganization?.memberCount ?? 0) > 1;
  const canDeleteOrganization =
    !!ownedOrganization && organizations.length > 1 && !!organization;

  async function handleOrganizationMembershipAction(
    action: OrganizationMembershipAction
  ) {
    if (!organization) {
      return;
    }

    setIsRemovingOrganization(true);

    const successMessage =
      action === "delete"
        ? `Deleted ${organization.name}`
        : `Left ${organization.name}`;

    try {
      await dashboardOrpc.user.membership.applyAction.call({
        organizationId: organization.id,
        action,
      });

      if (action === "delete") {
        trackEvent(POSTHOG_EVENTS.ORGANIZATION_DELETED, {
          deleted_organization_id: organization.id,
          had_other_members: hasOtherMembers,
          had_paid_history: null,
        });
      }

      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AUTH.organizations,
      });
      await queryClient.invalidateQueries({
        queryKey: dashboardOrpc.user.organizations.listOwned.queryKey(),
      });

      const freshOrgs = await queryClient.fetchQuery({
        queryKey: QUERY_KEYS.AUTH.organizations,
        queryFn: async () => {
          const result = await authClient.organization.list();
          return result.data ?? [];
        },
      });

      const firstOrg = freshOrgs[0];
      if (!firstOrg) {
        toast.error("You must keep at least one organization");
        setIsRemovingOrganization(false);
        return;
      }

      await authClient.organization.setActive({
        organizationId: firstOrg.id,
      });
      await setLastVisitedOrganization(firstOrg.slug);
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AUTH.activeOrganization,
      });

      toast.success(successMessage);
      router.push(`/${firstOrg.slug}?settings=account`);
    } catch (error) {
      toast.error("Failed to update organization membership");
      console.error(error);
    }
    setIsRemovingOrganization(false);
  }

  if (!organization) {
    return (
      <SettingsPane>
        <Skeleton className="h-64 rounded-lg" />
      </SettingsPane>
    );
  }

  return (
    <SettingsPane>
      <OrganizationDetailsCard organization={organization} slug={slug} />

      <ConnectedAccountsSection organizationId={organization.id} />

      {process.env.NODE_ENV === "development" && (
        <DevSampleDataCard organizationId={organization.id} />
      )}

      <TitleCard heading="Danger Zone">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Delete Organization</p>
              <p className="text-muted-foreground text-xs">
                Permanently delete this organization and all its data
              </p>
            </div>
            {canDeleteOrganization ? (
              <OrganizationMembershipActionDialog
                action="delete"
                hasOtherMembers={hasOtherMembers}
                onConfirm={() => handleOrganizationMembershipAction("delete")}
                organizationName={organization.name}
                trigger={
                  <Button
                    disabled={isRemovingOrganization}
                    size="sm"
                    variant="destructive"
                  >
                    {isRemovingOrganization ? (
                      <>
                        <Loader2Icon className="size-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      `${getOrganizationMembershipActionLabel("delete")} Organization`
                    )}
                  </Button>
                }
              />
            ) : (
              <Button disabled size="sm" variant="destructive">
                Delete Organization
              </Button>
            )}
          </div>
          {!isLoadingOwnedOrganizations && !ownedOrganization && (
            <p className="text-muted-foreground text-xs">
              Only organization owners can delete this organization.
            </p>
          )}
          {!isLoadingOwnedOrganizations &&
            ownedOrganization &&
            organizations.length <= 1 && (
              <p className="text-muted-foreground text-xs">
                You need at least one organization. Create another before
                deleting this one.
              </p>
            )}
        </div>
      </TitleCard>
    </SettingsPane>
  );
}

function ConnectedAccountsSection({
  organizationId,
}: {
  organizationId: string;
}) {
  const { data, isLoading, isError } = useConnectedAccounts(organizationId);
  useSocialConnectCallbackToasts(organizationId);
  const twitterConnect = useHandleConnectSocialAccount(
    organizationId,
    "twitter"
  );
  const linkedinConnect = useHandleConnectSocialAccount(
    organizationId,
    "linkedin"
  );

  const accounts = data?.accounts ?? [];
  const twitterAccounts = accounts.filter((a) => a.provider === "twitter");
  const linkedinAccounts = accounts.filter((a) => a.provider === "linkedin");

  return (
    <TitleCard heading="Connected Accounts">
      <div className="space-y-6">
        <p className="text-muted-foreground text-sm">
          X and LinkedIn accounts connected to this organization
        </p>

        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
          </div>
        )}

        {!isLoading && isError && (
          <div className="rounded-lg border border-dashed py-8 text-center">
            <p className="text-destructive text-sm">
              Failed to load connected accounts
            </p>
          </div>
        )}

        {!isLoading && !isError && (
          <>
            <ConnectedAccountsGroup
              accounts={twitterAccounts}
              connectLabel="Connect X Account"
              emptyLabel="No X accounts connected"
              icon={NewTwitterIcon}
              isConnecting={twitterConnect.isPending}
              label="X"
              onConnect={twitterConnect.handleConnect}
              organizationId={organizationId}
            />
            <ConnectedAccountsGroup
              accounts={linkedinAccounts}
              connectLabel="Connect LinkedIn Account"
              emptyLabel="No LinkedIn accounts connected"
              icon={Linkedin02Icon}
              isConnecting={linkedinConnect.isPending}
              label="LinkedIn"
              onConnect={linkedinConnect.handleConnect}
              organizationId={organizationId}
            />
          </>
        )}
      </div>
    </TitleCard>
  );
}

function ConnectedAccountsGroup({
  organizationId,
  label,
  icon,
  accounts,
  emptyLabel,
  connectLabel,
  onConnect,
  isConnecting,
}: ConnectedAccountsGroupProps) {
  const disconnectMutation = useDisconnectAccount(organizationId);
  const refreshMutation = useRefreshConnectedAccount(organizationId);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HugeiconsIcon className="size-4" icon={icon} />
          <p className="text-sm font-medium">{label}</p>
        </div>
        {accounts.length > 0 && (
          <Button disabled={isConnecting} onClick={onConnect} size="sm">
            {isConnecting ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <HugeiconsIcon className="size-3.5" icon={Add01Icon} />
            )}
            Connect
          </Button>
        )}
      </div>

      {accounts.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed py-8">
          <div className="bg-muted flex size-10 items-center justify-center rounded-full">
            <HugeiconsIcon className="size-5" icon={icon} />
          </div>
          <div className="text-center">
            <p className="text-muted-foreground text-sm">{emptyLabel}</p>
          </div>
          <Button disabled={isConnecting} onClick={onConnect} size="sm">
            {isConnecting ? (
              <>
                <Loader2Icon className="size-3.5 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <HugeiconsIcon className="size-3.5" icon={Add01Icon} />
                {connectLabel}
              </>
            )}
          </Button>
        </div>
      )}

      {accounts.map((account) => {
        const isDisconnecting =
          disconnectMutation.isPending &&
          disconnectMutation.variables === account.id;
        const isRefreshing =
          refreshMutation.isPending && refreshMutation.variables === account.id;
        const hasSquareAvatar = isSquareTwitterAvatar(account.verifiedType);

        return (
          <div
            className="flex items-center gap-3 rounded-lg border p-3"
            key={account.id}
          >
            <Avatar
              className={
                hasSquareAvatar ? "size-9 rounded-md" : "size-9 rounded-full"
              }
              size="sm"
            >
              {account.profileImageUrl && (
                <AvatarImage
                  alt={account.displayName}
                  src={account.profileImageUrl}
                />
              )}
              <AvatarFallback>
                {account.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 truncate text-sm font-medium">
                {account.displayName}
                <XVerificationBadge
                  className="size-4 shrink-0"
                  verified={account.verified}
                  verifiedType={account.verifiedType}
                />
              </p>
              <p className="text-muted-foreground truncate text-xs">
                @{account.username}
              </p>
            </div>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    aria-label={`Refresh @${account.username}`}
                    disabled={refreshMutation.isPending}
                    onClick={() => refreshMutation.mutate(account.id)}
                    size="icon-sm"
                    variant="outline"
                  />
                }
              >
                {isRefreshing ? (
                  <Loader2Icon className="size-3.5 animate-spin" />
                ) : (
                  <HugeiconsIcon
                    className="size-3.5"
                    icon={ArrowReloadHorizontalIcon}
                  />
                )}
              </TooltipTrigger>
              <TooltipContent>Refresh account details</TooltipContent>
            </Tooltip>
            <Button
              aria-label={`Disconnect @${account.username}`}
              disabled={disconnectMutation.isPending}
              onClick={() => {
                disconnectMutation.mutate(account.id, {
                  onSuccess: () => toast.success("Account disconnected"),
                  onError: () => toast.error("Failed to disconnect account"),
                });
              }}
              size="sm"
              variant="outline"
            >
              {isDisconnecting ? (
                <>
                  <Loader2Icon className="size-3.5 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <HugeiconsIcon className="size-3.5" icon={Cancel01Icon} />
                  Disconnect
                </>
              )}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
