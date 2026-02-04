"use client";

import { useQueries, useQueryClient } from "@tanstack/react-query";
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
import { usePathname } from "next/navigation";
import { useCustomer } from "autumn-js/react";
import { authClient } from "@/lib/auth/client";
import { QUERY_KEYS } from "@/utils/query-keys";

export type Organization = NonNullable<
  ReturnType<typeof authClient.useListOrganizations>["data"]
>[number];

interface OrganizationsContextValue {
  organizations: Organization[];
  activeOrganization: Organization | null;
  isLoading: boolean;
  getOrganization: (slug: string) => Organization | undefined;
}

const OrganizationsContext = createContext<OrganizationsContextValue | null>(
  null,
);

export function OrganizationsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const { refetch: refetchCustomer } = useCustomer();
  const hasAutoSelectedRef = useRef(false);
  const lastSyncedSlugRef = useRef<string | null>(null);
  const syncInProgressRef = useRef(false);
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
      {
        queryKey: QUERY_KEYS.AUTH.activeOrganization,
        queryFn: async () => {
          const result = await authClient.organization.getFullOrganization();
          return result.data ?? null;
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
      },
    ],
  });

  const organizations = organizationsData ?? [];
  const isLoading = isLoadingOrgs || isLoadingActive;
  const slugFromPath = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) {
      return null;
    }
    if (segments[0] === "account") {
      return null;
    }
    return segments[0] ?? null;
  }, [pathname]);

  // Clear optimistic state when real data arrives
  useEffect(() => {
    if (activeOrganization) {
      setOptimisticActiveOrg(null);
    }
  }, [activeOrganization]);

  useEffect(() => {
    if (isLoadingOrgs || isLoadingActive) {
      return;
    }
    if (!slugFromPath) {
      lastSyncedSlugRef.current = null;
      return;
    }
    if (activeOrganization?.slug === slugFromPath) {
      lastSyncedSlugRef.current = slugFromPath;
      return;
    }
    if (syncInProgressRef.current) {
      return;
    }

    const organizationFromPath = organizations.find(
      (org) => org.slug === slugFromPath,
    );
    if (!organizationFromPath) {
      return;
    }
    if (lastSyncedSlugRef.current === slugFromPath) {
      return;
    }

    lastSyncedSlugRef.current = slugFromPath;
    syncInProgressRef.current = true;
    setOptimisticActiveOrg(organizationFromPath);
    authClient.organization
      .setActive({ organizationId: organizationFromPath.id })
      .then((result) => {
        if (result.error) {
          console.error("Failed to sync organization:", result.error);
          setOptimisticActiveOrg(null);
          lastSyncedSlugRef.current = null;
        } else {
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.AUTH.activeOrganization,
          });
        }
      })
      .catch((error) => {
        console.error("Error syncing organization:", error);
        setOptimisticActiveOrg(null);
        lastSyncedSlugRef.current = null;
      })
      .finally(() => {
        syncInProgressRef.current = false;
      });
  }, [
    activeOrganization?.slug,
    isLoadingActive,
    isLoadingOrgs,
    organizations,
    queryClient,
    slugFromPath,
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
                result.error,
              );
              setOptimisticActiveOrg(null);
              hasAutoSelectedRef.current = false;
            } else {
              queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.AUTH.activeOrganization,
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
    (slug: string) => organizations.find((org) => org.slug === slug),
    [organizations]
  );

  const contextValue = useMemo<OrganizationsContextValue>(
    () => ({
      organizations,
      activeOrganization: activeOrganization ?? optimisticActiveOrg,
      isLoading,
      getOrganization,
    }),
    [organizations, activeOrganization, optimisticActiveOrg, isLoading, getOrganization]
  );

  useEffect(() => {
    if (!contextValue.activeOrganization?.id) {
      return;
    }

    refetchCustomer();
  }, [contextValue.activeOrganization?.id, refetchCustomer]);

  return (
    <OrganizationsContext.Provider value={contextValue}>
      {children}
    </OrganizationsContext.Provider>
  );
}

export function useOrganizationsContext() {
  const context = useContext(OrganizationsContext);
  if (!context) {
    throw new Error(
      "useOrganizationsContext must be used within OrganizationsProvider",
    );
  }
  return context;
}
