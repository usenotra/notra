import { useEffect } from "react";
import { toast, useSonner } from "sonner";

import { PREVIEW_TOAST_MESSAGE } from "../constants/preview-toast";
import type { PreviewToastMessage } from "../types/preview-toast";

export const PreviewToastBridge = () => {
  const { toasts } = useSonner();

  useEffect(() => {
    for (const item of toasts) {
      const message: PreviewToastMessage = {
        description:
          typeof item.description === "string" ? item.description : undefined,
        title: typeof item.title === "string" ? item.title : "",
        type: PREVIEW_TOAST_MESSAGE,
      };
      window.parent.postMessage(message, window.location.origin);
      toast.dismiss(item.id);
    }
  }, [toasts]);

  return null;
};
