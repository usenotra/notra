import { useRef } from "react";

function useLazyRef<T>(fn: () => T) {
  const ref = useRef<T | null>(null);

  if (ref.current === null) {
    ref.current = fn();
  }

  return ref as React.RefObject<T>;
}

export { useLazyRef };
