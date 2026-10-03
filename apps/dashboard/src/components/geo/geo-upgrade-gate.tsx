"use client";

import { SquareLock02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { GeoPageSkeleton } from "@/app/(dashboard)/[slug]/geo/skeleton";
import { GeoUpgradeDialog } from "@/components/billing/geo-upgrade-dialog";
import { Button } from "@/components/button";
import { EmptyStateAnalyticsPreview } from "@/components/empty-state-preview";
import { PageContainer } from "@/components/layout/container";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { PAYWALL_KINDS } from "@/constants/analytics-events";
import { localStorageKeys } from "@/constants/storage";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { toAnalyticsRoute } from "@/lib/analytics/route";
import { useHasGeoFeature } from "@/lib/hooks/use-plan";
import { pickSidebarMode } from "@/lib/hooks/use-sidebar-mode";
import type { GeoUpgradeGateProps } from "@/types/components/geo";
import { sidebarRouteFromPathname } from "@/utils/nav";

function subscribeToStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function GeoUpgradeGate({
  slug,
  children,
  fallback,
}: GeoUpgradeGateProps) {
  const t = useTranslations("geo.geoUpgradeGate");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const { activeOrganization, getOrganization } = useOrganizationsContext();
  const organizationId =
    (activeOrganization?.slug === slug
      ? activeOrganization
      : getOrganization(slug)
    )?.id ?? "";
  const { isLocked, isLoading, isUnavailable, isFetching, refetch } =
    useHasGeoFeature();
  const route = toAnalyticsRoute(pathname, slug);
  const [dismissedOrganizationId, setDismissedOrganizationId] = useState<
    string | null
  >(null);
  const [reopenedOrganizationId, setReopenedOrganizationId] = useState<
    string | null
  >(null);
  const dismissedInStorage = useSyncExternalStore(
    subscribeToStorage,
    () => {
      try {
        return (
          !organizationId ||
          window.localStorage.getItem(
            localStorageKeys.geoUpgradeDismissed(organizationId)
          ) === "1"
        );
      } catch {
        return false;
      }
    },
    () => true
  );
  const dialogOpen =
    isLocked &&
    Boolean(organizationId) &&
    (reopenedOrganizationId === organizationId ||
      (dismissedOrganizationId !== organizationId && !dismissedInStorage));
  const shownForOrganizationRef = useRef<string | null>(null);
  const navigateAfterCloseRef = useRef(false);

  useEffect(() => {
    if (!dialogOpen || shownForOrganizationRef.current === organizationId) {
      return;
    }
    shownForOrganizationRef.current = organizationId;
    trackEvent(POSTHOG_EVENTS.PAYWALL_SHOWN, {
      kind: PAYWALL_KINDS.GEO_LOCKED,
      route,
    });
  }, [dialogOpen, organizationId, route]);

  if (isLoading) {
    return fallback ?? <GeoPageSkeleton />;
  }

  if (isUnavailable) {
    return (
      <PageContainer className="flex flex-1 flex-col gap-4 p-6">
        <p className="text-muted-foreground text-sm" role="status">
          {t("verifyFailed")}
        </p>
        <Button
          className="w-fit"
          disabled={isFetching}
          onClick={() => {
            void refetch();
          }}
          type="button"
          variant="outline"
        >
          {tCommon("actions.tryAgain")}
        </Button>
      </PageContainer>
    );
  }

  if (!isLocked) {
    return children;
  }

  function handleDismiss(): void {
    const wasReopened = reopenedOrganizationId === organizationId;
    setDismissedOrganizationId(organizationId);
    setReopenedOrganizationId(null);
    shownForOrganizationRef.current = null;
    try {
      window.localStorage.setItem(
        localStorageKeys.geoUpgradeDismissed(organizationId),
        "1"
      );
    } catch {
      // Keep the dialog closed for this visit when storage is unavailable.
    }
    if (wasReopened) {
      return;
    }
    // The org root restores a stored "geo" mode by redirecting straight back
    // here, which would reopen this paywall in a loop. Switch the sidebar to
    // Studio first so the redirect lets the user land on the Studio home.
    pickSidebarMode("studio", sidebarRouteFromPathname(pathname));
    navigateAfterCloseRef.current = true;
  }

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="relative w-full overflow-hidden rounded-2xl px-4 lg:px-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 px-3 pt-3 select-none sm:px-4 sm:pt-4"
        >
          <div className="mask-[linear-gradient(to_bottom,black_0%,transparent_100%)] opacity-[0.38]">
            <EmptyStateAnalyticsPreview />
          </div>
        </div>
        <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center px-6 pt-16 pb-8 text-center">
          <HugeiconsIcon
            className="text-muted-foreground size-6"
            icon={SquareLock02Icon}
          />
          <h2 className="mt-3 text-lg font-semibold text-balance">
            {t("title")}
          </h2>
          <p className="text-muted-foreground mt-1.5 max-w-md text-sm leading-relaxed text-pretty">
            {tCommon("messages.aiVisibilityTrackingIsIncluded")}
          </p>
          <Button
            className="mt-4"
            onClick={() => setReopenedOrganizationId(organizationId)}
            type="button"
          >
            {tCommon("actions.upgrade")}
          </Button>
        </div>
      </div>
      <GeoUpgradeDialog
        onOpenChangeComplete={(open) => {
          if (!open && navigateAfterCloseRef.current) {
            navigateAfterCloseRef.current = false;
            router.push(`/${slug}`);
          }
        }}
        onOpenChange={(open) => {
          if (!open) {
            handleDismiss();
          }
        }}
        open={dialogOpen}
        slug={slug}
      />
    </PageContainer>
  );
}
