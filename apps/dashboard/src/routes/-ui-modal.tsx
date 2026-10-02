import { useLocation, useRouter } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import type { UiModalProviderProps } from "@/types/migration-routes";

const AccountModal = lazy(() =>
  import("@/components/analytics/account-modal").then((module) => ({
    default: module.AccountModal,
  }))
);
const AccountDetail = lazy(() =>
  import("@/components/analytics/account-detail-view").then((module) => ({
    default: module.AccountDetailView,
  }))
);
const CompetitorModal = lazy(() =>
  import("@/components/geo/competitor-modal").then((module) => ({
    default: module.CompetitorModal,
  }))
);
const CompetitorDetail = lazy(() =>
  import("@/components/geo/competitor-detail-view").then((module) => ({
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
            <AccountDetail
              handle={modal.name}
              organizationSlug={modal.organizationSlug}
            />
          </AccountModal>
        ) : null}
        {modal?.kind === "competitor" ? (
          <CompetitorModal key={modal.name} title={modal.name}>
            <CompetitorDetail
              competitor={modal.name}
              organizationSlug={modal.organizationSlug}
            />
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
