"use client";

import { useQueries, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { authClient } from "@/lib/auth/client";
import type { ClientSessionData } from "@/types/auth/session";
import { setLastVisitedOrganization } from "@/utils/cookies";
import { getOrganizationSlugFromPathname } from "@/utils/organization-pathname";
import {
  activeOrganizationQueryOptions,
  organizationSummaryQueryOptions,
} from "@/utils/organization-query";
import { QUERY_KEYS } from "@/utils/query-keys";

export type Organization = NonNullable<
  ReturnType<typeof authClient.useListOrganizations>["data"]
>[number];

export type InitialActiveOrganization = Organization;

interface OrganizationsContextValue {
  organizations: Organization[];
  activeOrganization: Organization | null;
  isLoading: boolean;
  getOrganization: (slug: string) => Organization | undefined;
}

const OrganizationsContext = createContext<OrganizationsContextValue | null>(
  null
);

const FALLBACK_ORGANIZATIONS_CONTEXT: OrganizationsContextValue = {
  organizations: [],
  activeOrganization: null,
  isLoading: true,
  getOrganization: () => undefined,
};

export function OrganizationsProvider({
  children,
  initialActiveOrganization,
}: {
  children: ReactNode;
  initialActiveOrganization?: InitialActiveOrganization | null;
}) {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const slugFromPath = getOrganizationSlugFromPathname(pathname);
  const hasAutoSelectedRef = useRef(false);
  const [optimisticActiveOrg, setOptimisticActiveOrg] =
    useState<Organization | null>(null);

  const [
    { data: organizationsData, isPending: isLoadingOrgs },
    { data: activeOrganization, isPending: isLoadingActive },
  ] = useQueries({
    queries: [
      {
        queryKey: QUERY_KEYS.AUTH.organizations,
        queryFn: async () => {
          const result = await authClient.organization.list();
          return result.data ?? [];
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
      },
      slugFromPath
        ? organizationSummaryQueryOptions(
            slugFromPath,
            initialActiveOrganization
          )
        : activeOrganizationQueryOptions(),
    ],
  });

  const organizations =
    organizationsData ?? FALLBACK_ORGANIZATIONS_CONTEXT.organizations;
  const isLoading = isLoadingOrgs || isLoadingActive;
  const organizationFromPath = useMemo(
    () =>
      slugFromPath
        ? (organizations.find((org) => org.slug === slugFromPath) ?? null)
        : null,
    [organizations, slugFromPath]
  );
  const seededActiveOrganization = useMemo(() => {
    if (!initialActiveOrganization) {
      return null;
    }

    if (slugFromPath && initialActiveOrganization.slug !== slugFromPath) {
      return null;
    }

    return initialActiveOrganization;
  }, [initialActiveOrganization, slugFromPath]);
  const activeOrganizationForPath =
    activeOrganization?.slug === slugFromPath ? activeOrganization : null;
  const resolvedActiveOrganization = slugFromPath
    ? (organizationFromPath ??
      activeOrganizationForPath ??
      seededActiveOrganization)
    : (activeOrganization ?? optimisticActiveOrg ?? seededActiveOrganization);

  // Clear optimistic state when real data arrives
  const [prevActiveOrganization, setPrevActiveOrganization] =
    useState(activeOrganization);
  if (activeOrganization !== prevActiveOrganization) {
    setPrevActiveOrganization(activeOrganization);
    if (activeOrganization) {
      setOptimisticActiveOrg(null);
    }
  }

  // Sole mechanism that points the server session at the organization in the
  // URL: `getAuthSession` resolves the active organization from this cookie, so
  // writing it is equivalent to (and cheaper than) `organization.setActive`.
  useEffect(() => {
    if (!slugFromPath || resolvedActiveOrganization?.slug !== slugFromPath) {
      return;
    }
    const activeId = resolvedActiveOrganization.id;

    setLastVisitedOrganization(slugFromPath)
      .then(() => {
        const session = queryClient.getQueryData<ClientSessionData | null>(
          QUERY_KEYS.AUTH.session
        );
        if (session && session.session.activeOrganizationId !== activeId) {
          return queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.AUTH.session,
          });
        }
      })
      .catch(() => {
        // Non-fatal: the session keeps its previous active organization.
      });
  }, [
    resolvedActiveOrganization?.slug,
    resolvedActiveOrganization?.id,
    slugFromPath,
    queryClient,
  ]);

  // Auto-select first organization if no active organization is set
  useEffect(() => {
    if (
      !(isLoadingOrgs || isLoadingActive) &&
      organizationsData &&
      organizationsData.length > 0 &&
      !activeOrganization &&
      !slugFromPath &&
      !hasAutoSelectedRef.current
    ) {
      const firstOrg = organizationsData[0];
      if (firstOrg) {
        hasAutoSelectedRef.current = true;
        setOptimisticActiveOrg(firstOrg);
        authClient.organization
          .setActive({ organizationId: firstOrg.id })
          .then((result) => {
            if (result.error) {
              console.error(
                "Failed to auto-set active organization:",
                result.error
              );
              setOptimisticActiveOrg(null);
              hasAutoSelectedRef.current = false;
            } else {
              queryClient.invalidateQueries({ refetchType: "none" });
              queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.AUTH.activeOrganization,
              });
              queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.AUTH.session,
              });
            }
          })
          .catch((error) => {
            console.error("Error auto-setting active organization:", error);
            setOptimisticActiveOrg(null);
            hasAutoSelectedRef.current = false;
          });
      }
    }
    if (activeOrganization === null && hasAutoSelectedRef.current) {
      hasAutoSelectedRef.current = false;
    }
  }, [
    isLoadingOrgs,
    isLoadingActive,
    organizationsData,
    activeOrganization,
    queryClient,
    slugFromPath,
  ]);

  const getOrganization = useCallback(
    (slug: string) =>
      organizations.find((org) => org.slug === slug) ??
      (resolvedActiveOrganization?.slug === slug
        ? resolvedActiveOrganization
        : undefined),
    [organizations, resolvedActiveOrganization]
  );

  const contextValue = useMemo<OrganizationsContextValue>(
    () => ({
      organizations,
      activeOrganization: resolvedActiveOrganization,
      isLoading,
      getOrganization,
    }),
    [organizations, resolvedActiveOrganization, isLoading, getOrganization]
  );

  return (
    <OrganizationsContext.Provider value={contextValue}>
      {children}
    </OrganizationsContext.Provider>
  );
}

export function useOrganizationsContext() {
  const context = useContext(OrganizationsContext);
  if (!context) {
    return FALLBACK_ORGANIZATIONS_CONTEXT;
  }
  return context;
}
