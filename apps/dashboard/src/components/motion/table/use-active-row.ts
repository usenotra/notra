import { useRef, useState } from "react";

export function useActiveRow() {
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const [activeRowEl, setActiveRowEl] = useState<HTMLTableRowElement | null>(
    null
  );
  const [activeRow, setActiveRow] = useState<{
    id: string;
    index: number;
  } | null>(null);
  const rowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activateRow = (id: string, index: number) => {
    if (rowTimer.current) {
      clearTimeout(rowTimer.current);
    }
    rowTimer.current = null;
    setActiveRowEl(rowRefs.current[id] ?? null);
    setActiveRow({ id, index });
  };
  const deactivateRow = () => {
    if (rowTimer.current) {
      clearTimeout(rowTimer.current);
    }
    rowTimer.current = setTimeout(() => setActiveRow(null), 100);
  };
  return { activeRow, activeRowEl, rowRefs, activateRow, deactivateRow };
}
