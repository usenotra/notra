import {
  redirect as routeRedirect,
  useLocation,
  useParams as useRouteParams,
  useRouter as useTanStackRouter,
} from "@tanstack/react-router";
import { useMemo } from "react";

import { modalNavigationOptions } from "@/utils/route-modal";

export function usePathname() {
  return useLocation({
    select: (location) => (location.maskedLocation ?? location).pathname,
  });
}

export function useSearchParams() {
  const search = useLocation({
    select: (location) => (location.maskedLocation ?? location).searchStr,
  });
  return useMemo(() => new URLSearchParams(search), [search]);
}

export function useParams<
  T extends Record<string, string | string[]> = Record<string, string>,
>() {
  const params = useRouteParams({ strict: false, structuralSharing: false });
  return params as T;
}

export function useRouter() {
  const router = useTanStackRouter();
  return useMemo(
    () => ({
      push: (href: string, options?: { scroll?: boolean }) =>
        router.navigate(
          modalNavigationOptions(router.state.location, href) ?? {
            href,
            resetScroll: options?.scroll ?? true,
          }
        ),
      replace: (href: string, options?: { scroll?: boolean }) =>
        router.navigate({
          ...(modalNavigationOptions(router.state.location, href) ?? {
            href,
            resetScroll: options?.scroll ?? true,
          }),
          replace: true,
        }),
      refresh: () => router.invalidate(),
      back: () => router.history.back(),
      forward: () => router.history.forward(),
      prefetch: (href: string) => {
        const url = new URL(href, "http://localhost");
        return router.preloadRoute({
          to: url.pathname,
          search: Object.fromEntries(url.searchParams),
        });
      },
    }),
    [router]
  );
}

export function redirect(href: string): never {
  throw routeRedirect({ href });
}
