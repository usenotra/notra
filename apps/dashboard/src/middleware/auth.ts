import { isDemoMode } from "@notra/utils/demo-mode";
import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import {
  authkitMiddleware,
  type AuthKitContext,
} from "@workos/authkit-tanstack-react-start";

import { NON_DASHBOARD_PATH } from "@/constants/auth-routes";
import { demoProxy } from "@/utils/demo-proxy";
import {
  evaluateLocalDevAuth,
  isLocalDevAuthEnabled,
  localDevAuthBlockedMessage,
} from "@/utils/local-dev-auth";

export const dashboardAuthMiddleware = createMiddleware().server(
  async (args) => {
    const { request, pathname, next } = args;
    if (
      process.env.NODE_ENV === "production" &&
      /^\/design-system(?:\/|$)/.test(pathname)
    ) {
      return new Response(null, { status: 404 });
    }
    if (
      /^\/(?:assets(?:\/|$)|api\/image(?:\/|$)|badges(?:\/|$)|demo\/[^/]+\.png$|favicon\.ico$|apple-icon\.png$|icon0\.svg$|icon1\.png$|robots\.txt$|design\.md(?:\/|$)|api\/webhooks\/|api\/geo\/ingest(?:\/|$)|api\/cron\/|api\/healthcheck(?:\/|$)|api\/workflows\/|api\/internal\/|\.well-known\/workflow\/|ingest\/)/.test(
        pathname
      )
    ) {
      return next();
    }
    if (isDemoMode()) {
      const response = demoProxy(request);
      if (response) {
        return response;
      }
      const result = await next();
      const headers = new Headers(result.response.headers);
      headers.set("X-Robots-Tag", "noindex, nofollow");
      return {
        ...result,
        response: new Response(result.response.body, {
          status: result.response.status,
          statusText: result.response.statusText,
          headers,
        }),
      };
    }
    if (isLocalDevAuthEnabled()) {
      const gate = evaluateLocalDevAuth(request.headers);
      if (gate.kind === "blocked") {
        return new Response(localDevAuthBlockedMessage(gate.reason), {
          status: 403,
        });
      }
      return next();
    }
    if (
      !process.env.WORKOS_REDIRECT_URI &&
      process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI
    ) {
      process.env.WORKOS_REDIRECT_URI =
        process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI;
    }
    const authenticate = authkitMiddleware().options.server;
    if (!authenticate) {
      throw new Error("AuthKit middleware is unavailable");
    }
    return authenticate({
      ...args,
      next: (options) => {
        const context = options?.context as AuthKitContext;
        if (
          !context.auth().user &&
          !NON_DASHBOARD_PATH.test(pathname) &&
          args.handlerType !== "serverFn"
        ) {
          const loginUrl = new URL("/login", request.url);
          loginUrl.searchParams.set(
            "returnTo",
            `${pathname}${new URL(request.url).search}`
          );
          throw redirect({ href: loginUrl.toString(), statusCode: 307 });
        }
        return next(options);
      },
    });
  }
);
