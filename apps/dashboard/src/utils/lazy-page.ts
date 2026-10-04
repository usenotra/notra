import { type ComponentType, type LazyExoticComponent, lazy } from "react";

/**
 * `React.lazy` with a `preload()` the router can call. TanStack Router warms
 * a route's code by calling `.preload()` on its component and pending
 * component when the route is preloaded (link hover) or loaded, so the chunk
 * downloads alongside the loader instead of after it.
 */
// oxlint-disable-next-line typescript/no-explicit-any -- same bound as React.lazy
export function lazyPage<T extends ComponentType<any>>(
  load: () => Promise<{ default: T }>
): LazyExoticComponent<T> & { preload: () => Promise<void> } {
  let pending: Promise<{ default: T }> | undefined;
  const loadOnce = () => {
    pending ??= load().catch((error: unknown) => {
      pending = undefined;
      throw error;
    });
    return pending;
  };
  return Object.assign(lazy(loadOnce), {
    preload: () => loadOnce().then(() => undefined),
  });
}
