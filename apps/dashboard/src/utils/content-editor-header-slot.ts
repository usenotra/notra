import { useLayoutEffect, useState } from "react";

import { CONTENT_EDITOR_HEADER_SLOT_ID } from "@/constants/content-detail";

function readHeaderSlot() {
  if (typeof document === "undefined") {
    return null;
  }
  return document.getElementById(CONTENT_EDITOR_HEADER_SLOT_ID);
}

export function useContentEditorHeaderSlot() {
  const [slot, setSlot] = useState<HTMLElement | null>(readHeaderSlot);

  useLayoutEffect(() => {
    setSlot(readHeaderSlot());
  }, []);

  return slot;
}
