import { useSyncExternalStore } from "react";
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

export default function PreviewToaster() {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getTheme,
    getServerTheme
  );

  return <Toaster theme={theme} />;
}
