import { useCallback, useState } from "react";

/**
 * Keeps the last non-null value rendered until a sheet or dialog finishes its
 * exit animation. Parents usually clear their selection the moment the sheet
 * closes, which would otherwise unmount or blank the content mid-animation.
 * Pass the returned callback to the root's `onOpenChangeComplete`.
 */
export function useRetainedValue<T>(value: T | null) {
  const [retained, setRetained] = useState(value);
  if (value !== null && value !== retained) {
    setRetained(value);
  }
  const release = useCallback((open: boolean) => {
    if (!open) {
      setRetained(null);
    }
  }, []);
  return [value ?? retained, release] as const;
}
