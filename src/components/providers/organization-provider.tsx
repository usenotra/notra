"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { authClient } from "@/lib/auth/auth-client";

export type Organization = NonNullable<
  ReturnType<typeof authClient.useListOrganizations>["data"]
>[number];

interface OrganizationsContextValue {
  organizations: Organization[];
  activeOrganization: Organization | null;
  isLoading: boolean;
  getOrganization: (slug: string) => Organization | undefined;
  refetch: () => void;
}

const OrganizationsContext = createContext<OrganizationsContextValue | null>(
  null
);

export function OrganizationsProvider({ children }: { children: ReactNode }) {
  const hasAutoSelectedRef = useRef(false);
  const [optimisticActiveOrg, setOptimisticActiveOrg] =
    useState<Organization | null>(null);

  const { data: organizationsData, isPending: isLoadingOrgs } =
    authClient.useListOrganizations();

  const {
    data: activeOrganization,
    isPending: isLoadingActive,
    refetch: refetchActive,
  } = authClient.useActiveOrganization();

  const organizations = organizationsData ?? [];
  const isLoading = isLoadingOrgs || isLoadingActive;

  useEffect(() => {
    if (activeOrganization) {
      setOptimisticActiveOrg(null);
    }
  }, [activeOrganization]);

  useEffect(() => {
    if (
      !(isLoadingOrgs || isLoadingActive) &&
      organizationsData &&
      organizationsData.length > 0 &&
      !activeOrganization &&
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
              setOptimisticActiveOrg(null);
              hasAutoSelectedRef.current = false;
            } else {
              refetchActive();
            }
          })
          .catch(() => {
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
    refetchActive,
  ]);

  const getOrganization = (slug: string) => {
    return organizations.find((org) => org.slug === slug);
  };

  const refetch = () => {
    refetchActive();
  };

  const contextValue: OrganizationsContextValue = {
    organizations,
    activeOrganization: activeOrganization ?? optimisticActiveOrg,
    isLoading,
    getOrganization,
    refetch,
  };

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
      "useOrganizationsContext must be used within OrganizationsProvider"
    );
  }
  return context;
}
