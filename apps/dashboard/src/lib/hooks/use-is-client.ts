import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;

export function useIsClient() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
