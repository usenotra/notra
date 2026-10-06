import { useState } from "react";

import type { SiteRootDirectoryToggleProps } from "@/types/components/sites";

export function useSiteRootDirectoryToggle(
  rootDirectory: string,
  onRootDirectoryChange: (value: string) => void
): SiteRootDirectoryToggleProps {
  const [opened, setOpened] = useState(false);
  return {
    checked: opened || rootDirectory.trim().length > 0,
    onCheckedChange: (next) => {
      setOpened(next);
      if (!next) {
        onRootDirectoryChange("");
      }
    },
  };
}
