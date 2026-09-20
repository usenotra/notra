"use client";

import { usePathname } from "next/navigation";
import { useQueryStates } from "nuqs";
import { useSyncExternalStore } from "react";

import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { useBrandSettings } from "@/lib/hooks/use-brand-analysis";
import { useReferences } from "@/lib/hooks/use-brand-references";
import { useSitemaps } from "@/lib/hooks/use-brand-sitemaps";
import type { NavBrandIdentityModel } from "@/types/components/nav";
import {
  buildBrandIdentityNavItems,
  resolveBrandIdentityNavView,
} from "@/utils/brand-identity-nav";
import {
  brandIdentityViewParser,
  brandIdentityVoiceParser,
} from "@/utils/brand-identity-search-params";
import {
  findSelectedBrandIdentity,
  readStoredBrandIdentityId,
} from "@/utils/brand-identity-selection";

function subscribeToStorage(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getServerStoredVoiceId(): string | null {
  return null;
}

export function useNavBrandIdentity(
  slug: string
): NavBrandIdentityModel | null {
  const { activeOrganization } = useOrganizationsContext();
  const organizationId = activeOrganization?.id ?? "";
  const pathname = usePathname();
  const [{ voice, view }] = useQueryStates({
    voice: brandIdentityVoiceParser,
    view: brandIdentityViewParser,
  });
  const { data } = useBrandSettings(organizationId);
  const voices = data?.voices ?? [];
  const brandBasePath = `/${slug}/brand/identity`;
  const storedVoiceId = useSyncExternalStore(
    subscribeToStorage,
    () => (organizationId ? readStoredBrandIdentityId(organizationId) : null),
    getServerStoredVoiceId
  );
  const activeVoice = findSelectedBrandIdentity(voices, voice, storedVoiceId);
  const activeVoiceId = activeVoice?.id;
  const { data: referencesData } = useReferences(
    organizationId,
    activeVoiceId ?? ""
  );
  const { data: sitemapsData } = useSitemaps(
    organizationId,
    activeVoiceId ?? ""
  );

  if (!organizationId) {
    return null;
  }

  return {
    items: buildBrandIdentityNavItems({
      basePath: brandBasePath,
      voiceId: activeVoiceId,
      activeView: resolveBrandIdentityNavView(pathname, brandBasePath, view),
      counts: {
        references: referencesData?.references.length ?? 0,
        sitemap: sitemapsData?.sitemaps.length ?? 0,
      },
    }),
  };
}
