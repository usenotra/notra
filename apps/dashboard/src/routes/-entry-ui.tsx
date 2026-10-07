import {
  type AnyRoute,
  createRoute,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { Suspense } from "react";

import AuthPublicLayout from "@/app/(auth-public)/layout";
import { AuthSplitShell } from "@/components/auth/auth-split-shell";
import { LoginErrorTracker } from "@/components/auth/login-error-tracker";
import { LoginForm } from "@/components/auth/login-form";
import { LoginFormSkeleton } from "@/components/auth/login-form-skeleton";
import { SocialEnrollmentResume } from "@/components/auth/social-enrollment-resume";
import { DemoStart } from "@/components/demo/demo-start";
import { InvitationConfirm } from "@/components/invitation/invitation-confirm";
import { lazyPage } from "@/utils/lazy-page";

import { createDevelopmentUiRoutes } from "./-development-ui";
import {
  loadAppEntry,
  loadAuthCallback,
  loadDemoEntry,
  loadGuestAccess,
  loadIntegrationEntry,
  loadLegacyApiKeys,
  loadLogin,
} from "./-entry-loaders";
import { loadInvitation } from "./-invitation-loaders";
import { createUiRoute } from "./-ui-route";

const Signup = lazyPage(() => import("@/app/(auth)/signup/page"));
const ForgotPassword = lazyPage(
  () => import("@/app/(auth)/forgot-password/page")
);
const ResetPassword = lazyPage(
  () => import("@/app/(auth-public)/reset-password/page")
);
const Banned = lazyPage(() => import("@/app/auth/banned/page"));
const Linkedin = lazyPage(() => import("@/app/connect/linkedin/page"));

export function createEntryUiRoutes(parent: AnyRoute) {
  const guest = createRoute({
    getParentRoute: () => parent,
    id: "guest",
    beforeLoad: () => loadGuestAccess(),
    component: () => (
      <AuthSplitShell>
        <Suspense fallback={<LoginFormSkeleton />}>
          <Outlet />
        </Suspense>
      </AuthSplitShell>
    ),
  });

  return [
    ...(process.env.NODE_ENV === "development"
      ? createDevelopmentUiRoutes(parent)
      : []),
    createUiRoute({
      parent,
      path: "/",
      component: () => null,
      loader: (input) => loadAppEntry({ data: input }),
    }),
    guest.addChildren([
      createUiRoute({
        parent: guest,
        path: "login",
        pendingComponent: LoginFormSkeleton,
        loader: (input) => loadLogin({ data: input }),
        component: ({ data }) => (
          <div className="mx-auto w-full max-w-md rounded-md p-6 lg:px-8 lg:py-10">
            {data.knownErrorKey ? (
              <LoginErrorTracker errorCode={data.knownErrorKey} />
            ) : null}
            {data.resumeEnrollmentFlowId ? (
              <SocialEnrollmentResume
                flowId={data.resumeEnrollmentFlowId}
                returnTo={data.returnTo}
              />
            ) : (
              <LoginForm
                initialError={data.initialError}
                initialPending={data.pending}
                returnTo={data.returnTo}
              />
            )}
          </div>
        ),
      }),
      createUiRoute({
        parent: guest,
        path: "signup",
        preload: Signup.preload,
        component: ({ searchParams }) => (
          <Signup
            returnTo={
              typeof searchParams.returnTo === "string"
                ? searchParams.returnTo
                : undefined
            }
          />
        ),
      }),
      createUiRoute({
        parent: guest,
        path: "forgot-password",
        preload: ForgotPassword.preload,
        component: () => <ForgotPassword />,
      }),
    ]),
    createUiRoute({
      parent,
      path: "reset-password",
      preload: ResetPassword.preload,
      component: () => (
        <AuthPublicLayout>
          <Suspense fallback={<LoginFormSkeleton />}>
            <ResetPassword />
          </Suspense>
        </AuthPublicLayout>
      ),
    }),
    createUiRoute({ parent, path: "auth/banned", component: () => <Banned /> }),
    createUiRoute({
      parent,
      path: "auth/demo",
      loader: (input) => loadDemoEntry({ data: input }),
      component: ({ data }) => (
        <div className="flex min-h-screen items-center justify-center p-6">
          <DemoStart returnTo={data.returnTo} />
        </div>
      ),
    }),
    createUiRoute({
      parent,
      path: "invitation",
      title: { title: "Invitation" },
      loader: (input) => loadInvitation({ data: input }),
      component: ({ data }) => (
        <AuthSplitShell>
          <InvitationConfirm data={data} />
        </AuthSplitShell>
      ),
    }),
    createUiRoute({
      parent,
      path: "callback",
      component: () => null,
      loader: (input) => loadAuthCallback({ data: input }),
    }),
    createUiRoute({
      parent,
      path: "connect/linkedin",
      preload: Linkedin.preload,
      component: () => <Linkedin />,
    }),
    createUiRoute({
      parent,
      path: "integrations/$integrationSlug",
      component: () => null,
      loader: (input) => loadIntegrationEntry({ data: input }),
    }),
    createUiRoute({
      parent,
      path: "api-keys",
      component: () => null,
      loader: () => loadLegacyApiKeys(),
    }),
    createUiRoute({
      parent,
      path: "home",
      component: () => null,
      loader: async () => {
        throw redirect({
          href: "https://www.usenotra.com/home",
          statusCode: 308,
        });
      },
    }),
    createUiRoute({
      parent,
      path: "landing",
      component: () => null,
      loader: async () => {
        throw redirect({
          href: "https://www.usenotra.com/landing",
          statusCode: 308,
        });
      },
    }),
  ];
}
