import { lazy, Suspense } from "react";
import type { ComponentType } from "react";

import { ChunkLoadBoundary } from "@/components/chunk-load-boundary";
import { useIsClient } from "@/lib/hooks/use-is-client";
import type { LazyComponentOptions } from "@/types/framework";

export default function lazyComponent<P extends object>(
  load: () => Promise<ComponentType<P> | { default: ComponentType<P> }>,
  options: LazyComponentOptions = {}
) {
  const Component = lazy(async () => {
    const loaded = await load();
    return { default: "default" in loaded ? loaded.default : loaded };
  });
  const Loading = options.loading;
  return function LazyComponent(props: P) {
    const isClient = useIsClient();
    const fallback = Loading ? <Loading /> : null;
    if (options.ssr === false && !isClient) {
      return fallback;
    }
    return (
      <ChunkLoadBoundary>
        <Suspense fallback={fallback}>
          <Component {...props} />
        </Suspense>
      </ChunkLoadBoundary>
    );
  };
}
