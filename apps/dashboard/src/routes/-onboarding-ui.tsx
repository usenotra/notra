import {
  type AnyRoute,
  createRoute,
  Outlet,
  type Router,
} from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import OnboardingLayout from "@/app/onboarding/layout";
import {
  loadOnboardingSplitLayout,
  OnboardingSplitLayout,
  OnboardingSplitLayoutProvider,
} from "@/components/onboarding/split-layout";
import { ONBOARDING_STEPS } from "@/constants/analytics-events";

import {
  loadOnboardingCompetitors,
  loadOnboardingEntry,
  loadOnboardingPricing,
  loadOnboardingVisibility,
  loadOnboardingWorkspace,
} from "./-onboarding-loaders";
import { createUiRoute } from "./-ui-route";

const Workspace = lazy(() =>
  import("@/app/onboarding/workspace/workspace-form").then((module) => ({
    default: module.WorkspaceForm,
  }))
);
const Visibility = lazy(() =>
  import("@/app/onboarding/visibility/visibility-form").then((module) => ({
    default: module.VisibilityForm,
  }))
);
const Competitors = lazy(() =>
  import("@/app/onboarding/competitors/competitors-form").then((module) => ({
    default: module.CompetitorsForm,
  }))
);
const Pricing = lazy(() =>
  import("@/app/onboarding/pricing-client").then((module) => ({
    default: module.PricingClient,
  }))
);

export function createOnboardingUiRoutes(parent: AnyRoute) {
  function OnboardingRouteLayout() {
    const context = onboarding.useLoaderData<Router<typeof onboarding>>();
    return (
      <OnboardingSplitLayoutProvider value={context}>
        <OnboardingLayout>
          <Suspense>
            <Outlet />
          </Suspense>
        </OnboardingLayout>
      </OnboardingSplitLayoutProvider>
    );
  }

  const onboarding = createRoute({
    getParentRoute: () => parent,
    path: "onboarding",
    loader: () => loadOnboardingSplitLayout(),
    component: OnboardingRouteLayout,
  });
  return [
    onboarding.addChildren([
      createUiRoute({
        parent: onboarding,
        path: "/",
        component: () => null,
        loader: (input) => loadOnboardingEntry({ data: input }),
      }),
      createUiRoute({
        parent: onboarding,
        path: "workspace",
        loader: (input) => loadOnboardingWorkspace({ data: input }),
        component: ({ data }) => (
          <OnboardingSplitLayout step={ONBOARDING_STEPS.WORKSPACE}>
            <Workspace {...data} />
          </OnboardingSplitLayout>
        ),
      }),
      createUiRoute({
        parent: onboarding,
        path: "visibility",
        title: { namespace: "onboarding.visibility", key: "metaTitle" },
        loader: (input) => loadOnboardingVisibility({ data: input }),
        component: ({ data }) => (
          <OnboardingSplitLayout step={ONBOARDING_STEPS.VISIBILITY}>
            <Visibility {...data} />
          </OnboardingSplitLayout>
        ),
      }),
      createUiRoute({
        parent: onboarding,
        path: "competitors",
        title: { namespace: "onboarding.competitors", key: "metaTitle" },
        loader: (input) => loadOnboardingCompetitors({ data: input }),
        component: ({ data }) => (
          <OnboardingSplitLayout step={ONBOARDING_STEPS.COMPETITORS}>
            <Competitors {...data} />
          </OnboardingSplitLayout>
        ),
      }),
      createUiRoute({
        parent: onboarding,
        path: "pricing",
        loader: (input) => loadOnboardingPricing({ data: input }),
        component: ({ data }) => <Pricing {...data} />,
      }),
    ]),
  ];
}
