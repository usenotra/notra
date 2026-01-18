import { useCallback, useState } from "react";

interface UseControllableStateParams<T> {
  prop?: T;
  defaultProp?: T;
  onChange?: (value: T) => void;
}

export function useControllableState<T>({
  prop,
  defaultProp,
  onChange,
}: UseControllableStateParams<T>) {
  const [uncontrolledProp, setUncontrolledProp] = useState(defaultProp as T);
  const isControlled = prop !== undefined;
  const value = isControlled ? prop : uncontrolledProp;

  const setValue = useCallback(
    (nextValue: T) => {
      if (isControlled) {
        onChange?.(nextValue);
      } else {
        setUncontrolledProp(nextValue);
        onChange?.(nextValue);
      }
    },
    [isControlled, onChange]
  );

  return [value, setValue] as const;
}
