"use client";

import { AutumnProvider } from "autumn-js/react";
import { useState } from "react";

import { AUTUMN_ORGANIZATION_HEADER } from "@/constants/billing";
import { authClient } from "@/lib/auth/client";
import { usePathname } from "@/lib/navigation";
import type { AutumnOrgProviderProps } from "@/types/components/providers";
import { getOrganizationSlugFromPathname } from "@/utils/organization-pathname";

const INITIAL_PROVIDER_KEY = "initial-organization";
const NO_ORGANIZATION_BASELINE = "no-organization";

export function AutumnOrgProvider({ children }: AutumnOrgProviderProps) {
  const pathname = usePathname();
  const pathSlug = getOrganizationSlugFromPathname(pathname);
  const { data: session, isPending } = authClient.useSession();
  const sessionOrganizationId = session?.session.activeOrganizationId ?? null;

  const [lastKnownOrganizationId, setLastKnownOrganizationId] = useState<
    string | null
  >(null);
  const [baselineOrganizationId, setBaselineOrganizationId] = useState<
    string | null
  >(null);

  if (
    sessionOrganizationId &&
    sessionOrganizationId !== lastKnownOrganizationId
  ) {
    setLastKnownOrganizationId(sessionOrganizationId);
  }

  if (baselineOrganizationId === null && !isPending) {
    setBaselineOrganizationId(
      sessionOrganizationId ?? NO_ORGANIZATION_BASELINE
    );
  }

  const effectiveOrganizationId =
    sessionOrganizationId ?? lastKnownOrganizationId;
  const hasSwitchedOrganization =
    effectiveOrganizationId !== null &&
    baselineOrganizationId !== null &&
    effectiveOrganizationId !== baselineOrganizationId;
  const sessionProviderKey = hasSwitchedOrganization
    ? effectiveOrganizationId
    : INITIAL_PROVIDER_KEY;
  const providerKey = pathSlug ? `slug:${pathSlug}` : sessionProviderKey;

  const headers = pathSlug
    ? { [AUTUMN_ORGANIZATION_HEADER]: pathSlug }
    : undefined;

  return (
    <AutumnProvider headers={headers} includeCredentials key={providerKey}>
      {children}
    </AutumnProvider>
  );
}
