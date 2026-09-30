"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { resetPostHogIdentity } from "@/lib/analytics/posthog-client";
import { isNextRedirectError } from "@/lib/auth/redirect-error";
import {
  discardTotpEnrollmentAction,
  getSecurityOverviewAction,
  regenerateBackupCodesAction,
  removeAuthFactorAction,
  startTotpEnrollmentAction,
  verifyTotpEnrollmentAction,
} from "@/lib/auth/security-actions";
import {
  deleteUserAction,
  listAccountsAction,
  requestPasswordResetAction,
  signOutAction,
  unlinkAccountAction,
  updateUserAction,
} from "@/lib/auth/user-actions";
import {
  cancelInvitationAction,
  createOrganizationAction,
  getFullOrganizationAction,
  getOrganizationSummaryAction,
  inviteMemberAction,
  listInvitationsAction,
  listMembersAction,
  listOrganizationsAction,
  removeMemberAction,
  resendInvitationAction,
  setActiveOrganizationAction,
  updateMemberRoleAction,
  updateOrganizationAction,
} from "@/lib/organizations/actions";
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
      const result = await listOrganizationsAction();
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
    try {
      await signOutAction();
    } catch (error) {
      if (!isNextRedirectError(error)) {
        throw error;
      }
    }
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
  updateUser: updateUserAction,
  deleteUser: deleteUserAction,
  requestPasswordReset: requestPasswordResetAction,
  listAccounts: listAccountsAction,
  unlinkAccount: unlinkAccountAction,
  security: {
    getOverview: getSecurityOverviewAction,
    startTotpEnrollment: startTotpEnrollmentAction,
    verifyTotpEnrollment: verifyTotpEnrollmentAction,
    discardTotpEnrollment: discardTotpEnrollmentAction,
    removeAuthFactor: removeAuthFactorAction,
    regenerateBackupCodes: regenerateBackupCodesAction,
  },
  organization: {
    create: createOrganizationAction,
    update: updateOrganizationAction,
    list: listOrganizationsAction,
    setActive: setActiveOrganizationAction,
    getFullOrganization: getFullOrganizationAction,
    getSummary: getOrganizationSummaryAction,
    listMembers: listMembersAction,
    listInvitations: listInvitationsAction,
    inviteMember: inviteMemberAction,
    cancelInvitation: cancelInvitationAction,
    resendInvitation: resendInvitationAction,
    updateMemberRole: updateMemberRoleAction,
    removeMember: removeMemberAction,
  },
};
