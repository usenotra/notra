"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { resetPostHogIdentity } from "@/lib/analytics/posthog-client";
import { signOutAction } from "@/lib/auth/sign-out-action";
import { dashboardOrpcClient } from "@/lib/orpc/client";
import type { SignOutOptions } from "@/types/auth/client";
import type { ClientSessionData } from "@/types/auth/session";
import { QUERY_KEYS } from "@/utils/query-keys";

async function fetchSession(): Promise<ClientSessionData | null> {
  const response = await fetch("/api/session", { cache: "no-store" });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

function useSession() {
  const query = useQuery({
    queryKey: QUERY_KEYS.AUTH.session,
    queryFn: fetchSession,
    staleTime: 60 * 1000,
  });

  return {
    data: query.data ?? null,
    isPending: query.isPending,
    error: query.error,
    refetch: query.refetch,
  };
}

function useListOrganizations() {
  const query = useQuery({
    queryKey: QUERY_KEYS.AUTH.organizations,
    queryFn: async () => {
      const result = await dashboardOrpcClient.organization.list();
      return result.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    data: query.data ?? null,
    isPending: query.isPending,
    error: query.error,
    refetch: query.refetch,
  };
}

function useSessionInvalidation() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.setQueryData(QUERY_KEYS.AUTH.session, null);
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AUTH.session });
  };
}

function useSignOut() {
  const invalidateSession = useSessionInvalidation();

  return async (options?: SignOutOptions) => {
    await signOutAction({ returnTo: options?.returnTo });
    invalidateSession();
    resetPostHogIdentity();
    options?.fetchOptions?.onSuccess?.();
  };
}

export const authClient = {
  useSession,
  useListOrganizations,
  useSessionInvalidation,
  useSignOut,
  updateUser: dashboardOrpcClient.user.account.update,
  deleteUser: () => dashboardOrpcClient.user.account.delete(),
  requestPasswordReset: () =>
    dashboardOrpcClient.user.account.requestPasswordReset(),
  listAccounts: () => dashboardOrpcClient.user.account.listConnections(),
  unlinkAccount: dashboardOrpcClient.user.account.unlinkConnection,
  security: {
    getOverview: () => dashboardOrpcClient.user.security.overview(),
    startTotpEnrollment: () =>
      dashboardOrpcClient.user.security.startTotpEnrollment(),
    verifyTotpEnrollment:
      dashboardOrpcClient.user.security.verifyTotpEnrollment,
    discardTotpEnrollment:
      dashboardOrpcClient.user.security.discardTotpEnrollment,
    removeAuthFactor: dashboardOrpcClient.user.security.removeAuthFactor,
    regenerateBackupCodes:
      dashboardOrpcClient.user.security.regenerateBackupCodes,
  },
  organization: {
    create: dashboardOrpcClient.organization.create,
    update: dashboardOrpcClient.organization.update,
    list: () => dashboardOrpcClient.organization.list(),
    setActive: dashboardOrpcClient.organization.setActive,
    getFullOrganization: dashboardOrpcClient.organization.getFull,
    getSummary: dashboardOrpcClient.organization.getSummary,
    listMembers: dashboardOrpcClient.organization.listMembers,
    listInvitations: dashboardOrpcClient.organization.listInvitations,
    inviteMember: dashboardOrpcClient.organization.inviteMember,
    cancelInvitation: dashboardOrpcClient.organization.cancelInvitation,
    resendInvitation: dashboardOrpcClient.organization.resendInvitation,
    updateMemberRole: dashboardOrpcClient.organization.updateMemberRole,
    removeMember: dashboardOrpcClient.organization.removeMember,
  },
};
