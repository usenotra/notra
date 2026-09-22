"use client";

import { useEffect, useRef } from "react";

/** keepPreviousData, but skip the placeholder when `scope` changed. */
export function useScopedPreviousData<TData>(scope: string | undefined) {
  const previousScope = useRef(scope);
  useEffect(() => {
    previousScope.current = scope;
  }, [scope]);
  return (previousData: TData | undefined): TData | undefined =>
    previousScope.current === scope ? previousData : undefined;
}
