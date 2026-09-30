import { useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import { toast } from "sonner";

import { Toaster } from "@/components/ui/sonner";

import {
  getServerTheme,
  getTheme,
  isPreviewToastMessage,
  subscribeToTheme,
} from "../lib/preview-toast";

const handleMessage = (event: MessageEvent) => {
  if (
    event.origin !== window.location.origin ||
    !isPreviewToastMessage(event.data)
  ) {
    return;
  }
  toast(event.data.title, { description: event.data.description });
};

if (typeof window !== "undefined") {
  window.addEventListener("message", handleMessage);
}

const toasterStyle = {
  "--border-radius": "var(--blume-radius)",
  "--normal-bg": "var(--blume-background)",
  "--normal-border": "var(--blume-border)",
  "--normal-text": "var(--blume-foreground)",
} as CSSProperties;

export default function PreviewToaster() {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getTheme,
    getServerTheme
  );

  return <Toaster style={toasterStyle} theme={theme} />;
}
