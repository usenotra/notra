import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useLocation, useRouter } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { CompetitorDetailSkeleton } from "@/app/(dashboard)/[slug]/geo/competitors/skeleton";
import { AccountModal } from "@/components/analytics/account-modal";
import { CompetitorModal } from "@/components/geo/competitor-modal";
import type { UiModalProviderProps } from "@/types/migration-routes";
import { loadCompetitorDetailView } from "@/utils/competitor-detail-chunk";

// The sheets themselves are tiny and open on click; only their (heavy) detail
// views load lazily, behind skeletons inside the already open sheet.
const AccountDetail = lazy(() =>
  import("@/components/analytics/account-detail-view").then((module) => ({
    default: module.AccountDetailView,
  }))
);
const CompetitorDetail = lazy(() =>
  loadCompetitorDetailView().then((module) => ({
    default: module.CompetitorDetailView,
  }))
);
const FramerDialog = lazy(() =>
  import("@/components/integrations/framer-setup-guide-dialog").then(
    (module) => ({ default: module.FramerSetupGuideDialog })
  )
);
const RaycastDialog = lazy(() =>
  import("@/components/integrations/raycast-setup-guide-dialog").then(
    (module) => ({ default: module.RaycastSetupGuideDialog })
  )
);

function AccountDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

export function UiModalProvider({ children }: UiModalProviderProps) {
  const router = useRouter();
  const modal = useLocation({
    select: (location) =>
      location.maskedLocation ? location.state.notraModal : undefined,
  });
  const close = (open: boolean) => {
    if (!open) {
      router.history.back();
    }
  };
  return (
    <>
      {children}
      <Suspense fallback={null}>
        {modal?.kind === "account" ? (
          <AccountModal key={modal.name} title={modal.name}>
            <Suspense fallback={<AccountDetailSkeleton />}>
              <AccountDetail
                handle={modal.name}
                organizationSlug={modal.organizationSlug}
              />
            </Suspense>
          </AccountModal>
        ) : null}
        {modal?.kind === "competitor" ? (
          <CompetitorModal key={modal.name} title={modal.name}>
            <Suspense fallback={<CompetitorDetailSkeleton />}>
              <CompetitorDetail
                competitor={modal.name}
                organizationSlug={modal.organizationSlug}
              />
            </Suspense>
          </CompetitorModal>
        ) : null}
        {modal?.kind === "framer" ? (
          <FramerDialog
            onOpenChange={close}
            open
            organizationSlug={modal.organizationSlug}
          />
        ) : null}
        {modal?.kind === "raycast" ? (
          <RaycastDialog
            onOpenChange={close}
            open
            organizationSlug={modal.organizationSlug}
          />
        ) : null}
      </Suspense>
    </>
  );
}
