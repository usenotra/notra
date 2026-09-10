"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import type {
  RightPanelContextValue,
  RightPanelId,
} from "@/types/components/right-panel";

const INITIAL_HAS_OPENED: Record<RightPanelId, boolean> = {
  agent: false,
  content: false,
};

export function useRightPanelState(): RightPanelContextValue {
  const pathname = usePathname();
  const [active, setActive] = useState<RightPanelId | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [hasOpened, setHasOpened] = useState(INITIAL_HAS_OPENED);

  const openPanel = (id: RightPanelId) => {
    setActive(id);
    setHasOpened((current) =>
      current[id] ? current : { ...current, [id]: true }
    );
  };

  const closePanel = (id?: RightPanelId) => {
    setActive((current) => {
      if (id && current !== id) {
        return current;
      }
      return null;
    });
  };

  const togglePanel = (id: RightPanelId) => {
    setActive((current) => (current === id ? null : id));
    setHasOpened((opened) => (opened[id] ? opened : { ...opened, [id]: true }));
  };

  const toggleExpanded = () => {
    if (active === null) {
      return;
    }
    setExpanded((current) => !current);
  };

  useEffect(() => {
    if (active === null) {
      setExpanded(false);
    }
  }, [active]);

  useEffect(() => {
    setExpanded(false);
  }, [pathname]);

  useEffect(() => {
    if (!expanded) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) {
        return;
      }
      event.preventDefault();
      setExpanded(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expanded]);

  return {
    active,
    expanded,
    hasOpened,
    openPanel,
    closePanel,
    togglePanel,
    toggleExpanded,
  };
}
