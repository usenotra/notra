"use client";

import { SquareLock02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { GeoPageSkeleton } from "@/app/(dashboard)/[slug]/geo/skeleton";
import { GeoUpgradeDialog } from "@/components/billing/geo-upgrade-dialog";
import { Button } from "@/components/button";
import { EmptyStateAnalyticsPreview } from "@/components/empty-state-preview";
import { PageContainer } from "@/components/layout/container";
import { PAYWALL_KINDS } from "@/constants/analytics-events";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { toAnalyticsRoute } from "@/lib/analytics/route";
import { useHasGeoFeature } from "@/lib/hooks/use-plan";
import { pickSidebarMode } from "@/lib/hooks/use-sidebar-mode";
import type { GeoUpgradeGateProps } from "@/types/components/geo";
import { sidebarRouteFromPathname } from "@/utils/nav";

export function GeoUpgradeGate({
  slug,
  children,
  fallback,
}: GeoUpgradeGateProps) {
  const t = useTranslations("geo.geoUpgradeGate");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const { isLocked, isLoading, isUnavailable, isFetching, refetch } =
    useHasGeoFeature();
  const route = toAnalyticsRoute(pathname, slug);
  const shownRef = useRef(false);

  useEffect(() => {
    if (!isLocked || shownRef.current) {
      return;
    }
    shownRef.current = true;
    trackEvent(POSTHOG_EVENTS.PAYWALL_SHOWN, {
      kind: PAYWALL_KINDS.GEO_LOCKED,
      route,
    });
  }, [isLocked, route]);

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
    // The org root restores a stored "geo" mode by redirecting straight back
    // here, which would reopen this paywall in a loop. Switch the sidebar to
    // Studio first so the redirect lets the user land on the Studio home.
    pickSidebarMode("studio", sidebarRouteFromPathname(pathname));
    router.push(`/${slug}`);
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
        </div>
      </div>
      <GeoUpgradeDialog
        onOpenChange={(open) => {
          if (!open) {
            handleDismiss();
          }
        }}
        open
        slug={slug}
      />
    </PageContainer>
  );
}
