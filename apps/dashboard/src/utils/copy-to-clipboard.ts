import type { CopyToClipboardErrorReason } from "@notra/ui/types/copy-button";
import { toast } from "sonner";

import { commonToastMessage } from "@/utils/toast-message";

export async function writeClipboardText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // A browser may block the async API while still allowing a native copy.
    }
  }

  const activeElement = document.activeElement;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.readOnly = true;
  textarea.tabIndex = -1;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  try {
    textarea.select();
    if (!document.execCommand("copy")) {
      throw new Error("Clipboard copy was denied");
    }
  } finally {
    textarea.remove();
    if (activeElement instanceof HTMLElement) {
      activeElement.focus({ preventScroll: true });
    }
  }
}

export function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
  toast.success(commonToastMessage("copied"));
}

export async function copyTextToClipboard(
  text: string,
  successMessage: string
): Promise<void> {
  if (!navigator.clipboard?.writeText) {
    toast.error(commonToastMessage("clipboardUnsupported"));
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    toast.error(commonToastMessage("copyFailed"));
    return;
  }
  toast.success(successMessage);
}

/** `onCopyError` handler for `CopyButton` / `useCopyToClipboard`. */
export function toastCopyError(reason: CopyToClipboardErrorReason) {
  toast.error(
    commonToastMessage(
      reason === "unsupported" ? "clipboardUnsupported" : "copyFailed"
    )
  );
}
