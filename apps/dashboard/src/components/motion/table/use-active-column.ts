import { useRef, useState } from "react";

export function useActiveColumn() {
  const [activeColumn, setActiveColumn] = useState<string | null>(null);
  // Let the pointer cross the gap to the portal handle before deactivating.
  const deactivateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activateColumn = (key: string) => {
    if (deactivateTimer.current) {
      clearTimeout(deactivateTimer.current);
    }
    deactivateTimer.current = null;
    setActiveColumn(key);
  };
  const deactivateColumn = () => {
    if (deactivateTimer.current) {
      clearTimeout(deactivateTimer.current);
    }
    deactivateTimer.current = setTimeout(() => setActiveColumn(null), 100);
  };
  return { activeColumn, activateColumn, deactivateColumn };
}
