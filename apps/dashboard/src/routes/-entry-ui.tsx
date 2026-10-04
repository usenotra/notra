import {
  type AnyRoute,
  createRoute,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { Suspense } from "react";

import AuthPublicLayout from "@/app/(auth-public)/layout";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { AuthLegalNotice } from "@/components/auth/auth-legal-notice";
import { AuthThemeHotkey } from "@/components/auth/auth-theme-hotkey";
import { AuthWordmark } from "@/components/auth/auth-wordmark";
import { LoginErrorTracker } from "@/components/auth/login-error-tracker";
import { LoginForm } from "@/components/auth/login-form";
import { LoginFormSkeleton } from "@/components/auth/login-form-skeleton";
import { SocialEnrollmentResume } from "@/components/auth/social-enrollment-resume";
import { DemoStart } from "@/components/demo/demo-start";
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
    component: () => {
      return (
        <div className="flex h-screen w-full justify-center lg:grid lg:grid-cols-2">
          <AuthThemeHotkey />
          <section className="flex h-full min-h-0 w-full flex-col items-center justify-between px-6 py-5 lg:px-10 lg:py-6">
            <AuthWordmark href="https://usenotra.com" />
            <div className="w-full max-w-md">
              <Suspense fallback={<LoginFormSkeleton />}>
                <Outlet />
              </Suspense>
            </div>
            <div>
              <AuthLegalNotice />
            </div>
          </section>
          <div className="relative hidden lg:flex">
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="corner-squircle relative h-full w-full overflow-hidden rounded-md supports-[corner-shape:squircle]:rounded-2xl">
                <AuthBrandPanel />
              </div>
            </div>
          </div>
        </div>
      );
    },
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
        component: () => <Signup />,
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
